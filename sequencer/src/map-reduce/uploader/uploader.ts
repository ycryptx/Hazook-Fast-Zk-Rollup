import * as path from 'path';
import { PassThrough, Readable } from 'stream';
import { createReadStream, appendFileSync, unlinkSync } from 'fs';
import { Upload } from '@aws-sdk/lib-storage';
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  GetObjectCommandOutput,
  PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { RollupProofBase } from '@ycryptx/rollup';

import { Mode } from '../types';
import { runShellCommand } from '../utils';
import { logger } from '../../utils';

/**
 * Uploads data to make it available to the Hadoop map-reduce pipeline
 */
export class Uploader<RollupProof extends RollupProofBase> {
  private mode: Mode;
  private s3Client?: S3Client;
  private inputBucket?: string;
  private outputBucket?: string;

  constructor(mode: Mode, region: string) {
    this.mode = mode;
    if (this.mode == Mode.EMR) {
      this.s3Client = new S3Client({ region });
      this.inputBucket = `${process.env.BUCKET_PREFIX}-emr-input`;
      this.outputBucket = `${process.env.BUCKET_PREFIX}-emr-output`;
    } else if (this.mode == Mode.LOCAL) {
      // do something
    }
  }

  /**
   * Uploads an input file from disk to be used by Hadoop map-reduce
   *
   * @param localFilePath
   * @returns the url for where the MapReduce function can access the data
   */
  public async uploadInputFromDisk(localFilePath: string): Promise<string> {
    return this.mode == Mode.LOCAL
      ? this.uploadToLocalHadoopFromDisk(localFilePath)
      : this.uploadToS3FromDisk(localFilePath);
  }

  /**
   * Uploads intermediate proofs to S3 for EMR processing.
   *
   * @param hadoopOutputLocation The location of the Hadoop output.
   * @returns The S3 location of the uploaded intermediate proofs.
   */
  public async uploadIntermediateProofs(
    hadoopOutputLocation: string,
  ): Promise<string> {
    logger.info(
      `Uploading intermediate proofs from ${hadoopOutputLocation} ...`,
    );
    if (this.mode == Mode.LOCAL) {
      return this.uploadIntermediateProofsHadoop(hadoopOutputLocation);
    } else if (this.mode == Mode.EMR) {
      return this.uploadIntermediateProofsEMR(hadoopOutputLocation);
    }
  }

  /**
   * Downloads the outputs of a Hadoop map-reduce job
   *
   * @param outputDir the URL of the output data directory (e.g. s3://my-bucket-output-data/output-123/)
   * @returns proofs
   */
  public async getOutput(outputDir: string): Promise<RollupProof[]> {
    return this.mode == Mode.LOCAL
      ? this.getLocalHadoopOutput(outputDir)
      : this.getEMROutput(outputDir);
  }

  private async uploadIntermediateProofsHadoop(
    hadoopOutputLocation: string,
  ): Promise<string> {
    const filePath = path.join(
      __dirname,
      '../',
      `preprocessed/input-${Date.now()}`,
    );
    const rawOutput = await this.getRawLocalHadoopOutput(hadoopOutputLocation);
    const newInputBlob = rawOutput.split('\t\n').join('\n');
    appendFileSync(filePath, newInputBlob);
    const inputLocation = await this.uploadToLocalHadoopFromDisk(filePath);
    unlinkSync(filePath);
    return inputLocation;
  }

  /**
   * Uploads intermediate proofs to S3 for EMR processing.
   *
   * @param hadoopOutputLocation The location of the Hadoop output.
   * @returns The S3 location of the uploaded intermediate proofs.
   */
  private async uploadIntermediateProofsEMR(
    hadoopOutputLocation: string,
  ): Promise<string> {
    logger.info(`Getting EMR output from ${hadoopOutputLocation} ...`);
    const sourceBucket = this.outputBucket;
    const destinationBucket = this.inputBucket;
    const destinationKey = `from-${hadoopOutputLocation}`;
    const outputParts = await this.listNonEmptyObjectsWithPrefix(
      sourceBucket,
      `${hadoopOutputLocation}/part`,
    );

    logger.info(`# of EMR output parts: ${outputParts.length}`);

    await this.streamS3ObjectsToSingleObject(
      sourceBucket,
      outputParts,
      destinationBucket,
      destinationKey,
    );

    logger.info(
      `Finished streaming objects from source to destination buckets`,
    );

    return `s3://${destinationBucket}/${destinationKey}`;
  }

  private async streamS3ObjectsToSingleObject(
    sourceBucket: string,
    sourceKeys: string[],
    destinationBucket: string,
    destinationKey: string,
  ): Promise<void> {
    const stream = new PassThrough();

    const uploadPromise = this.uploadToS3(
      destinationBucket,
      destinationKey,
      stream,
    );

    for (const key of sourceKeys) {
      const command = new GetObjectCommand({
        Bucket: sourceBucket,
        Key: key,
      });

      const responseStream = (await this.s3Client.send(command))
        .Body as Readable;
      for await (const chunk of responseStream) {
        stream.write(chunk);
      }
    }
    stream.end();

    // Wait for the upload to complete
    await uploadPromise.done();
  }

  private async getRawLocalHadoopOutput(outputDir: string): Promise<string> {
    const container = process.env.HADOOP_LOCAL_CONTAINER_NAME;

    let hadoopResults: string;

    // check if there are results from hadoop for 50 minutes max
    for (let i = 0; i < 100; i++) {
      hadoopResults = runShellCommand(
        `docker exec ${container} hdfs dfs -cat ${outputDir}/*`,
      );
      if (hadoopResults) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 3)); // hack
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * 30));
    }
    return hadoopResults;
  }

  private async getLocalHadoopOutput(
    outputDir: string,
  ): Promise<RollupProof[]> {
    const hadoopResults = await this.getRawLocalHadoopOutput(outputDir);
    const splitHadoopResults = hadoopResults
      .split('\t\n')
      .filter((res) => res != '');

    return this.deserializeIntermediateProofs(splitHadoopResults);
  }

  private async getEMROutput(emrOutputPath: string): Promise<RollupProof[]> {
    logger.info(`Getting EMR output from ${emrOutputPath} ...`);
    const results: Promise<string>[] = [];

    const outputParts = await this.listNonEmptyObjectsWithPrefix(
      this.outputBucket,
      `${emrOutputPath}/part`,
    );

    logger.info(`# of EMR output parts: ${outputParts.length}`);
    const requests: Promise<GetObjectCommandOutput>[] = [];
    for (const part of outputParts) {
      const command = new GetObjectCommand({
        Bucket: this.outputBucket,
        Key: part,
      });
      requests.push(this.s3Client.send(command));
    }
    const responses = await Promise.all(requests);
    logger.info(`Downloaded all EMR output parts from S3`);
    for (const response of responses) {
      results.push(response.Body.transformToString());
    }

    const proofs = await Promise.all(results).then((proofs) =>
      this.deserializeIntermediateProofs(proofs),
    );

    logger.info(`Deserialized and parsed all downloaded EMR outputs from S3`);

    return proofs;
  }

  private deserializeIntermediateProofs(proofs: string[]): RollupProof[] {
    logger.info(`Deserializing intermediate proofs...`);
    const _results: { proof: RollupProof; order: number }[] = [];
    const arraysOfProofs = proofs
      .filter((_proofs) => _proofs.trim() != '')
      .map((_proofs) => _proofs.split('\n'));

    for (const proofArray of arraysOfProofs) {
      for (const proof of proofArray) {
        const [lineNumber, _sequentialism, _intermediateStage, proofString] =
          proof.split('\t');
        if (proofString) {
          _results.push({
            proof: JSON.parse(proofString),
            order: parseInt(lineNumber),
          });
        }
      }
    }
    return _results
      .sort((res1, res2) => res1.order - res2.order)
      .map((res) => res.proof);
  }

  /**
   * Returns all Hadoop map-reduce output parts that are non-empty
   *
   * @param prefix
   * @returns
   */
  private async listNonEmptyObjectsWithPrefix(
    bucket: string,
    prefix: string,
  ): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: 1000000,
    });

    const response = await this.s3Client.send(command);

    // The response contains the list of non-empty objects that match the prefix
    // we filter by non-empty because most hadoop reduce containers generate an empty part file
    // that we want to ignore
    const matchingObjects = response.Contents.filter((c) => c.Size != 0).map(
      (c) => c.Key,
    );

    return matchingObjects;
  }

  // TODO: add an upload function that takes as input TransactionBase
  private async uploadToS3FromDisk(filePath: string): Promise<string> {
    const fileReadStream = createReadStream(filePath, { encoding: 'utf-8' });
    const bucket = this.inputBucket;
    const key = `input-${Date.now()}`;

    const uploader = this.uploadToS3(bucket, key, fileReadStream);
    await uploader.done();
    return `s3://${bucket}/${key}`;
  }

  private uploadToS3(
    bucket: string,
    key: string,
    stream: PutObjectCommandInput['Body'],
  ): Upload {
    const uploader = new Upload({
      client: this.s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: stream,
      },

      tags: [
        /*...*/
      ], // optional tags
    });

    uploader.on('httpUploadProgress', (progress) => {
      logger.info(progress);
    });
    return uploader;
  }

  private async uploadToLocalHadoopFromDisk(filePath: string): Promise<string> {
    const container = process.env.HADOOP_LOCAL_CONTAINER_NAME;
    const fileName = path.parse(filePath).base;
    const mapperFilePath = path.join(
      __dirname,
      '../../',
      process.env.MAPPER_FILE_PATH,
    );
    const reducerFilePath = path.join(
      __dirname,
      '../../',
      process.env.REDUCER_FILE_PATH,
    );

    runShellCommand(`docker exec ${container} hdfs dfs -mkdir /user`);
    runShellCommand(`docker exec ${container} hdfs dfs -mkdir /user/hduser`);
    runShellCommand(`docker exec ${container} hdfs dfs -mkdir input`);
    runShellCommand(
      `docker cp ${filePath} ${container}:/home/hduser/hadoop-3.3.3/etc/hadoop/`,
    );
    runShellCommand(
      `docker exec ${container} hdfs dfs -put /home/hduser/hadoop-3.3.3/etc/hadoop/${fileName} input`,
    );
    runShellCommand(
      `docker cp ${mapperFilePath} ${container}:/home/hduser/hadoop-3.3.3/etc/hadoop/`,
    );
    runShellCommand(
      `docker cp ${reducerFilePath} ${container}:/home/hduser/hadoop-3.3.3/etc/hadoop/`,
    );

    runShellCommand(
      `docker exec ${container} sudo chmod a+x /home/hduser/hadoop-3.3.3/etc/hadoop/mapper.js /home/hduser/hadoop-3.3.3/etc/hadoop/reducer.js`,
    );

    return `/user/hduser/input/${fileName}`;
  }
}
