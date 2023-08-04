import { createReadStream } from 'fs';
import * as path from 'path';
import { Upload } from '@aws-sdk/lib-storage';
import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { RollupProof, Accumulator } from '@ycryptx/rollup';

import { Mode } from '../types';
import { runShellCommand } from '../utils';

/**
 * Uploads data to make it available to the Hadoop map-reduce pipeline
 */
export class Uploader {
  private mode: Mode;
  private s3Client?: S3Client;

  constructor(mode: Mode, region: string) {
    this.mode = mode;
    if (this.mode == Mode.EMR) {
      this.s3Client = new S3Client({ region });
    } else if (this.mode == Mode.LOCAL) {
      // do something
    }
  }

  public async getAccumulatedEMROutput(emrOutputPath: string): Promise<string> {
    const intermediateProofs = (
      await this.getIntermediateEMROutputs(emrOutputPath)
    ).map((proofString) => JSON.parse(proofString));

    const accumulatedProof = await this.accumulateProofs(intermediateProofs);

    return JSON.stringify(accumulatedProof.toJSON());
  }

  public async getAccumulatedLocalHadoopOutput(
    container: string,
    outputDir: string,
  ): Promise<string> {
    // get intermediate results
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
    const splitHadoopResults = hadoopResults
      .split('\t\n')
      .filter((res) => res != '');
    const serializedHadoopResults = splitHadoopResults.map((proofString) =>
      JSON.parse(proofString),
    );
    const sortedProofs = serializedHadoopResults
      .sort((res1, res2) => res1.order - res2.order)
      .map((res) => res.proof);
    const accumulatedProof = await this.accumulateProofs(sortedProofs);

    return JSON.stringify(accumulatedProof.toJSON());
  }

  private async accumulateProofs(
    intermediateProofs: RollupProof[],
  ): Promise<RollupProof> {
    const accumulator = new Accumulator();
    for (const proof of intermediateProofs) {
      await accumulator.addProof(proof);
    }
    return accumulator.accumulatedProof;
  }

  private async getIntermediateEMROutputs(
    emrOutputPath: string,
  ): Promise<string[]> {
    const results: Promise<string>[] = [];

    const outputParts = await this.listObjectsWithPrefix(
      `${emrOutputPath}/part`,
    );
    const requests: Promise<GetObjectCommandOutput>[] = [];
    for (const part of outputParts) {
      const command = new GetObjectCommand({
        Bucket: `${process.env.BUCKET_PREFIX}-emr-output`,
        Key: part,
      });
      requests.push(this.s3Client.send(command));
    }
    const responses = await Promise.all(requests);
    for (const response of responses) {
      results.push(response.Body.transformToString());
    }
    return Promise.all(results);
  }

  // Function to list objects with a specific prefix
  async listObjectsWithPrefix(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: `${process.env.BUCKET_PREFIX}-emr-output`,
      Prefix: prefix,
    });

    const response = await this.s3Client.send(command);

    // The response contains the list of objects that match the prefix
    const matchingObjects = response.Contents.map((c) => c.Key);

    return matchingObjects;
  }

  /**
   * Uploads the file to a storage accessible to the MapReduce service
   *
   * @param filePath
   * @returns the url/path where the MapReduce function can access the data
   */
  public async upload(filePath: string): Promise<string> {
    return this.mode == Mode.LOCAL
      ? this.uploadToLocalHadoop(filePath)
      : this.uploadToS3(filePath);
  }

  private async uploadToS3(filePath: string): Promise<string> {
    const fileReadStream = createReadStream(filePath, { encoding: 'utf-8' });
    const bucket = `${process.env.BUCKET_PREFIX}-emr-input`;
    const key = `input-${Date.now()}`;

    const parallelUploads3 = new Upload({
      client: this.s3Client,
      params: {
        Bucket: bucket,
        Key: key,
        Body: fileReadStream,
      },

      tags: [
        /*...*/
      ], // optional tags
      queueSize: 4, // optional concurrency configuration
      partSize: 1024 * 1024 * 5, // optional size of each part, in bytes, at least 5MB
      leavePartsOnError: false, // optional manually handle dropped parts
    });

    parallelUploads3.on('httpUploadProgress', (progress) => {
      console.log(progress);
    });

    await parallelUploads3.done();
    return `${bucket}/${key}`;
  }

  private async uploadToLocalHadoop(filePath: string): Promise<string> {
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
