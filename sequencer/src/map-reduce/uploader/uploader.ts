import { createReadStream, ReadStream } from 'fs';
import { exec } from 'child_process';
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
    const fileReadStream = createReadStream(filePath, { encoding: 'utf-8' });
    exec(
      `docker exec ${process.env.HADOOP_LOCAL_CONTAINER_NAME} 
            hdfs dfs -mkdir /user;
            hdfs dfs -mkdir /user/hduser;`,
      (err, stdout) => {
        if (err) {
          console.error(err);
        } else {
          console.log(stdout);
        }
      },
    );

    return this.mode == Mode.LOCAL
      ? this._uploadToLocalHadoop(fileReadStream)
      : this._uploadToS3(fileReadStream);
  }

  private async _uploadToLocalHadoop(data: ReadStream): Promise<void> {
    console.log(data.read(100));
    return;
  }

  private async _uploadToS3(data: ReadStream): Promise<void> {
    try {
      const parallelUploads3 = new Upload({
        client: this.s3Client,
        params: {
          Bucket: process.env.BUCKET,
          Key: process.env.BUCKET_KEY,
          Body: data,
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
}
