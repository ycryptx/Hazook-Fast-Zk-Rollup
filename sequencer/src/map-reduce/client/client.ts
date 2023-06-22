import { EMRClient, AddInstanceFleetCommand, AddInstanceFleetCommandInput } from "@aws-sdk/client-emr"
import { Mode } from '../types'

export class MapReduceClient {


    constructor(mode: Mode) {
        const emrCLient = new EMRClient({ region })
    }

    async process(): Promise<void> {
        return
    }

    async _processEmr() {
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
}