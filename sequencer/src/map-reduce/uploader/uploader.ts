import { createReadStream } from 'fs';
import { parse } from 'path';
import { execSync } from 'child_process';
import { Upload } from '@aws-sdk/lib-storage';
import { S3Client } from '@aws-sdk/client-s3';
import { Mode } from '../types';

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

  public async upload(filePath: string): Promise<void> {
    return this.mode == Mode.LOCAL
      ? this._uploadToLocalHadoop(filePath)
      : this._uploadToS3(filePath);
  }

  private async _uploadToS3(filePath: string): Promise<void> {
    const fileReadStream = createReadStream(filePath, { encoding: 'utf-8' });

    try {
      const parallelUploads3 = new Upload({
        client: this.s3Client,
        params: {
          Bucket: process.env.BUCKET,
          Key: process.env.BUCKET_KEY,
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
    } catch (e) {
      console.log(e);
    }
  }

  private async _uploadToLocalHadoop(filePath: string): Promise<void> {
    const container = process.env.HADOOP_LOCAL_CONTAINER_NAME;
    const fileName = parse(filePath).base;

    this._runShellCommand(`docker exec ${container} hdfs dfs -mkdir /user`);
    this._runShellCommand(
      `docker exec ${container} hdfs dfs -mkdir /user/hduser`,
    );
    this._runShellCommand(`docker exec ${container} hdfs dfs -mkdir input`);
    this._runShellCommand(
      `docker cp ${filePath} ${container}:/home/hduser/hadoop-3.3.3/etc/hadoop/`,
    );
    this._runShellCommand(
      `docker exec ${container} hdfs dfs -put /home/hduser/hadoop-3.3.3/etc/hadoop/${fileName} input`,
    );

    return;
  }

  private _runShellCommand(cmd: string): void {
    try {
      const resp = execSync(cmd);
      console.log('SUCCESS:', resp);
    } catch (err) {
      console.error(err);
    }
  }
}
