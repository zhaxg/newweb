import { Formatter } from "@hprose/io";

import { crudApi } from "../admin/request";
import type { SaveChangesInputV2 } from "../admin/types";
import type { SaveChangesData, TrackableList } from "./trackableList";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function assign<T extends { [key: string]: any }>(target: any, source: any) {
  for (const key in source) {
    const value = source[key] as T[typeof key];
    if (target[key] !== value) {
      target[key] = value;
    }
  }
}

export const crudAppService = {
  SaveList: async <T extends { [key: string]: any }>(trackList: TrackableList<T>, entityName: string) => {
    const binaryData = Formatter.serialize(trackList.SaveChangesData);
    const base64 = uint8ArrayToBase64(binaryData);

    const data: SaveChangesInputV2 = {
      dataTypeName: entityName,
      batchDataBytesBase64String: base64,
      singleDataBytesBase64String: "",
    };

    const respose = await crudApi.saveChangesV2(data);
    const respBinary = base64ToUint8Array(respose);
    const respValue = Formatter.deserialize(respBinary) as SaveChangesData<T>;
    for (const item of respValue.addedItems) {
      const finded = trackList.find((x) => (x as any).id === (item as any).id);
      assign(finded, item);
    }
    for (const item of respValue.changedItems) {
      const finded = trackList.find((x) => (x as any).id === (item as any).id);
      assign(finded, item);
    }

    trackList.reset();
  },

  SaveSingleData: async <T extends { [key: string]: any }>(singleValue: T, entityName: string): Promise<void> => {
    const binaryData = Formatter.serialize(singleValue);
    const base64 = uint8ArrayToBase64(binaryData);

    const data: SaveChangesInputV2 = {
      dataTypeName: entityName,
      batchDataBytesBase64String: "",
      singleDataBytesBase64String: base64,
    };

    const response = await crudApi.saveChangesV2(data);

    const respBinary = base64ToUint8Array(response);
    const respValue = Formatter.deserialize(respBinary) as Partial<T>;

    assign(singleValue, respValue);
  },
};
