import { EMRClient, AddInstanceFleetCommand, AddInstanceFleetCommandInput } from "@aws-sdk/client-emr"

const main = async () => {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    throw new Error("Missing args")
  }

  const client = new EMRClient({ region: args[0] })

  // TODO: call EMR with the job

  const params: AddInstanceFleetCommandInput = {
    ClusterId: "",
    InstanceFleet: undefined
  }
  const command = new AddInstanceFleetCommand(params)

  try {
    const data = await client.send(command)
    console.log(data)
    // process data.
  } catch (error) {
    // error handling.
  } finally {
    // finally.
  }
}

main()