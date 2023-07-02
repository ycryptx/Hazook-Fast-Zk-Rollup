/* eslint-disable */
import type { CallContext, CallOptions } from "nice-grpc-common";
import * as _m0 from "protobufjs/minimal";

export const protobufPackage = "services.sequencer.v1";

export enum Case {
  CASE_RUN_UNSPECIFIED = 0,
  CASE_RUN_1 = 1,
  CASE_RUN_2 = 2,
  CASE_RUN_3 = 3,
  CASE_RUN_4 = 4,
  UNRECOGNIZED = -1,
}

export function caseFromJSON(object: any): Case {
  switch (object) {
    case 0:
    case "CASE_RUN_UNSPECIFIED":
      return Case.CASE_RUN_UNSPECIFIED;
    case 1:
    case "CASE_RUN_1":
      return Case.CASE_RUN_1;
    case 2:
    case "CASE_RUN_2":
      return Case.CASE_RUN_2;
    case 3:
    case "CASE_RUN_3":
      return Case.CASE_RUN_3;
    case 4:
    case "CASE_RUN_4":
      return Case.CASE_RUN_4;
    case -1:
    case "UNRECOGNIZED":
    default:
      return Case.UNRECOGNIZED;
  }
}

export function caseToJSON(object: Case): string {
  switch (object) {
    case Case.CASE_RUN_UNSPECIFIED:
      return "CASE_RUN_UNSPECIFIED";
    case Case.CASE_RUN_1:
      return "CASE_RUN_1";
    case Case.CASE_RUN_2:
      return "CASE_RUN_2";
    case Case.CASE_RUN_3:
      return "CASE_RUN_3";
    case Case.CASE_RUN_4:
      return "CASE_RUN_4";
    case Case.UNRECOGNIZED:
    default:
      return "UNRECOGNIZED";
  }
}

export interface DemoRequest {
  case: Case;
}

export interface DemoResponse {
  result: string;
}

function createBaseDemoRequest(): DemoRequest {
  return { case: 0 };
}

export const DemoRequest = {
  encode(message: DemoRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.case !== 0) {
      writer.uint32(8).int32(message.case);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DemoRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDemoRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.case = reader.int32() as any;
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DemoRequest {
    return { case: isSet(object.case) ? caseFromJSON(object.case) : 0 };
  },

  toJSON(message: DemoRequest): unknown {
    const obj: any = {};
    message.case !== undefined && (obj.case = caseToJSON(message.case));
    return obj;
  },

  create(base?: DeepPartial<DemoRequest>): DemoRequest {
    return DemoRequest.fromPartial(base ?? {});
  },

  fromPartial(object: DeepPartial<DemoRequest>): DemoRequest {
    const message = createBaseDemoRequest();
    message.case = object.case ?? 0;
    return message;
  },
};

function createBaseDemoResponse(): DemoResponse {
  return { result: "" };
}

export const DemoResponse = {
  encode(message: DemoResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.result !== "") {
      writer.uint32(10).string(message.result);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): DemoResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseDemoResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.result = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): DemoResponse {
    return { result: isSet(object.result) ? String(object.result) : "" };
  },

  toJSON(message: DemoResponse): unknown {
    const obj: any = {};
    message.result !== undefined && (obj.result = message.result);
    return obj;
  },

  create(base?: DeepPartial<DemoResponse>): DemoResponse {
    return DemoResponse.fromPartial(base ?? {});
  },

  fromPartial(object: DeepPartial<DemoResponse>): DemoResponse {
    const message = createBaseDemoResponse();
    message.result = object.result ?? "";
    return message;
  },
};

export type SequencerServiceDefinition = typeof SequencerServiceDefinition;
export const SequencerServiceDefinition = {
  name: "SequencerService",
  fullName: "services.sequencer.v1.SequencerService",
  methods: {
    demo: {
      name: "Demo",
      requestType: DemoRequest,
      requestStream: false,
      responseType: DemoResponse,
      responseStream: false,
      options: {},
    },
  },
} as const;

export interface SequencerServiceImplementation<CallContextExt = {}> {
  demo(request: DemoRequest, context: CallContext & CallContextExt): Promise<DeepPartial<DemoResponse>>;
}

export interface SequencerServiceClient<CallOptionsExt = {}> {
  demo(request: DeepPartial<DemoRequest>, options?: CallOptions & CallOptionsExt): Promise<DemoResponse>;
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
