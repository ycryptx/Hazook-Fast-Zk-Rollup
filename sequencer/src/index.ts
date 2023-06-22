import { EMRClient, AddInstanceFleetCommand, AddInstanceFleetCommandInput } from "@aws-sdk/client-emr"
import { Uploader, Mode } from "./uploader";

const main = async () => {
  const args = process.argv.slice(2);
  const [region, _] = args

  if (args.length < 2) {
    throw new Error("Missing args")
  }

  const emrCLient = new EMRClient({ region })
  const dataUploader = new Uploader(Mode.LOCAL, region)

  // uplaod data to Hadoop
  await dataUploader.upload({})

  // TODO: call EMR with the job

  const params: AddInstanceFleetCommandInput = {
    ClusterId: "",
    InstanceFleet: undefined
  }
  const command = new AddInstanceFleetCommand(params)

  try {
    const data = await emrCLient.send(command)
    console.log(data)
    // process data.
  } catch (error) {
    // error handling.
  } finally {
    // finally.
  }
}

main()