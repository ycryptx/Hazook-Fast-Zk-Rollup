import { Uploader, Mode, MapReduceClient } from "./map-reduce";

const main = async () => {
  const args = process.argv.slice(2);
  const [region, _] = args

  if (args.length < 2) {
    throw new Error("Missing args")
  }

  const dataUploader = new Uploader(Mode.LOCAL, region)
  const mapReduce = new MapReduceClient(Mode.LOCAL)

  // uplaod data to Hadoop
  await dataUploader.upload({})

  // start Hadoop map-reduce operation
  await mapReduce.process()

}

main()