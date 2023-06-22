import 'dotenv/config';
import { resolve } from 'path';
import { Uploader, Mode, MapReduceClient } from './map-reduce';

const main = async () => {
  const mode = process.env.MODE == 'local' ? Mode.LOCAL : Mode.EMR;
  const region = process.env.REGION;

  const dataUploader = new Uploader(mode, region);
  const mapReduce = new MapReduceClient(mode, region);

  const dataFilePath = resolve(__dirname, process.env.INPUT_DATA_FILE_PATH);

  // uplaod data to Hadoop
  await dataUploader.upload(dataFilePath);

  // start Hadoop map-reduce operation
  await mapReduce.process();
};

main();
