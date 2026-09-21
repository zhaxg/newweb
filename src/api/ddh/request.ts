import { requestClient } from "@/api/_core/request";

import type {
  BxcomEntity,
  DtoThr3010,
  L2ME01,
  L2ME02,
  L2ME05,
  L2MsgViewDto,
  MEL202,
  MEL203,
  MEL204,
  MEL206,
  MEL8JP401,
  MEL8JP402,
  MEL8JP403,
  MessageCutHeart,
  MessageRollHeart,
  Thr3010,
  TiBxcomMessage,
  TimeRange,
  TqmGCLen,
  TqmGCThick,
  TqmGCWth,
  Xcom8JP403Input,
} from "./types";

export const bxcomMessageApi = {
  consumeMsg(data?: string[]) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bxcomMessage/consumeMsg",
      {
        method: "post",
        data,
      },
    );
  },
  saveMsg(data?: TiBxcomMessage) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bxcomMessage/saveMsg",
      {
        method: "post",
        data,
      },
    );
  },
  sendMEL02(slabNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bxcomMessage/sendMEL02",
      {
        method: "post",
        params: { slabNo },
      },
    );
  },
  sendMEL204(slabNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bxcomMessage/sendMEL204",
      {
        method: "post",
        params: { slabNo },
      },
    );
  },
  send8JP4012(slabNo?: string) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bxcomMessage/send8JP401_2",
      {
        method: "post",
        params: { slabNo },
      },
    );
  },
  send8JP403(data?: Xcom8JP403Input) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bxcomMessage/send8JP403",
      {
        method: "post",
        data,
      },
    );
  },
};

export const bxcomTestApi = {
  getAllMessages(msgType?: string, data?: TimeRange) {
    return requestClient.request<TiBxcomMessage[]>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getAllMessages",
      {
        method: "post",
        params: { msgType },
        data,
      },
    );
  },
  getMessageById(id?: string) {
    return requestClient.request<TiBxcomMessage>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getMessageById",
      {
        method: "post",
        params: { id },
      },
    );
  },
  validL2Message(tmp2020Id?: string) {
    return requestClient.request<L2MsgViewDto>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/validL2Message",
      {
        method: "post",
        params: { tmp2020Id },
      },
    );
  },
  getInterface() {
    return requestClient.request<BxcomEntity[]>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getInterface",
      {
        method: "post",
      },
    );
  },
  getRollHeart() {
    return requestClient.request<MessageRollHeart>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getRollHeart",
      {
        method: "post",
      },
    );
  },
  getCutHeart() {
    return requestClient.request<MessageCutHeart>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getCutHeart",
      {
        method: "post",
      },
    );
  },
  sendToBxcom(data?: BxcomEntity) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/sendToBxcom",
      {
        method: "post",
        data,
      },
    );
  },
  receivedByBxcom(data?: BxcomEntity) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/receivedByBxcom",
      {
        method: "post",
        data,
      },
    );
  },
  demoReceivedByBxcom(data?: DtoThr3010) {
    return requestClient.request<any>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/demo_ReceivedByBxcom",
      {
        method: "post",
        data,
      },
    );
  },
  getMEL202() {
    return requestClient.request<MEL202>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getMEL202",
      {
        method: "post",
      },
    );
  },
  getMEL203() {
    return requestClient.request<MEL203>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getMEL203",
      {
        method: "post",
      },
    );
  },
  getMEL204() {
    return requestClient.request<MEL204>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getMEL204",
      {
        method: "post",
      },
    );
  },
  getMEL206() {
    return requestClient.request<MEL206>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getMEL206",
      {
        method: "post",
      },
    );
  },
  getMEL8JP401() {
    return requestClient.request<MEL8JP401>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getMEL8JP401",
      {
        method: "post",
      },
    );
  },
  getMEL8JP402() {
    return requestClient.request<MEL8JP402>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getMEL8JP402",
      {
        method: "post",
      },
    );
  },
  getMEL8JP403() {
    return requestClient.request<MEL8JP403>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getMEL8JP403",
      {
        method: "post",
      },
    );
  },
  getL2ME01() {
    return requestClient.request<L2ME01>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getL2ME01",
      {
        method: "post",
      },
    );
  },
  getL2ME02() {
    return requestClient.request<L2ME02>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getL2ME02",
      {
        method: "post",
      },
    );
  },
  getL2ME05() {
    return requestClient.request<L2ME05>(
      "/dDH.Service.Interface.Services.BX/bxcomTest/getL2ME05",
      {
        method: "post",
      },
    );
  },
};

export const gCApi = {
  getThick(type?: string, thick?: number, width?: number) {
    return requestClient.request<TqmGCThick>(
      "/dDH.Service.Interface.Services.BX/gC/getThick",
      {
        method: "post",
        params: { type, thick, width },
      },
    );
  },
  getWth(type?: string, thick?: number, width?: number) {
    return requestClient.request<TqmGCWth>(
      "/dDH.Service.Interface.Services.BX/gC/getWth",
      {
        method: "post",
        params: { type, thick, width },
      },
    );
  },
  getLen(type?: string, thick?: number, len?: number) {
    return requestClient.request<TqmGCLen>(
      "/dDH.Service.Interface.Services.BX/gC/getLen",
      {
        method: "post",
        params: { type, thick, len },
      },
    );
  },
};

export const quYangApi = {
  needQY(data?: Thr3010) {
    return requestClient.request<boolean>(
      "/dDH.Service.Impl.XCom/quYang/needQY",
      {
        method: "post",
        data,
      },
    );
  },
};
