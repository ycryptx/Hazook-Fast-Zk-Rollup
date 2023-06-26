import 'dotenv/config';
import { Mode, MapReduceClient } from './map-reduce';

export const generateStateProof = async (
  dataFilePath: string,
): Promise<any> => {
  const mode = process.env.MODE == 'local' ? Mode.LOCAL : Mode.EMR;
  const region = process.env.REGION;

  const mapReduce = new MapReduceClient(mode, region);

  // uplaod data to Hadoop
  const inputLocation = await mapReduce.upload(dataFilePath);

  // start Hadoop map-reduce operation
  return mapReduce.process(inputLocation);
};
