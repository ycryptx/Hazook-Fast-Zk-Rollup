import { createReadStream } from 'fs';
import { parse, resolve } from 'path';
import { Upload } from '@aws-sdk/lib-storage';
import { S3Client } from '@aws-sdk/client-s3';

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

  /**
   * Uploads the file to a storage accessible to the MapReduce service
   *
   * @param filePath
   * @returns the url/path where the MapReduce function can access the data
   */
  public async upload(filePath: string): Promise<string> {
    return this.mode == Mode.LOCAL
      ? this._uploadToLocalHadoop(filePath)
      : this._uploadToS3(filePath);
  }

  private async _uploadToS3(filePath: string): Promise<string> {
    const fileReadStream = createReadStream(filePath, { encoding: 'utf-8' });
    const bucket = process.env.BUCKET;
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
    return `${bucket}:${key}`;
  }

  private async _uploadToLocalHadoop(filePath: string): Promise<string> {
    const container = process.env.HADOOP_LOCAL_CONTAINER_NAME;
    const fileName = parse(filePath).base;
    const mapperFilePath = resolve(
      __dirname,
      '../../../..',
      process.env.MAPPER_FILE_PATH,
    );
    const reducerFilePath = resolve(
      __dirname,
      '../../../..',
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
