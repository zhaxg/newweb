import { requestClient } from "@/api/_core/request";

/** 对应 IPrintReportAppService（Hmx.Service.Widgets）：模板查询/读写/删除（删为 web 扩展） */
export interface PrintTemplateRow {
  id: string;
  cDataType: string;
  createTime?: string;
  lastModifyTime?: string;
  cComments?: string;
  nTemplateType: number;
  /** 模板 JSON（原 XR 为 byte[]，web 不兼容旧二进制，存 UTF-8 JSON 文本） */
  cTemplateData?: string;
  creator?: string;
  lastModifier?: string;
}

export interface SavePrintTemplateInput {
  templateId?: string;
  printDTOType: string;
  templateData: string;
  templateType?: number;
  comments?: string;
}

export interface ReadPrintTemplateResult {
  templateId: string;
  printDTOType: string;
  templateData: string;
  templateType: number;
}

const BASE = "/hmx.Service.Widgets.Services/printReport";

export const printReportApi = {
  queryAllTemplates(templateType = 2) {
    return requestClient.request<PrintTemplateRow[]>(`${BASE}/queryAllTemplates`, {
      method: "post",
      params: { templateType },
    });
  },
  saveOrUpdateTemplate(data: SavePrintTemplateInput) {
    return requestClient.request<string>(`${BASE}/saveOrUpdateTemplate`, {
      method: "post",
      data: {
        templateID: data.templateId ?? "",
        printDTOType: data.printDTOType,
        templateData: data.templateData,
        templateType: data.templateType ?? 2,
        comments: data.comments ?? "",
      },
    });
  },
  readFromTemplate(templateId: string) {
    return requestClient.request<ReadPrintTemplateResult>(`${BASE}/readFromTemplate`, {
      method: "post",
      params: { templateId },
    });
  },
  /** web 扩展：原 WinForms 删除为空实现 */
  removeTemplate(templateId: string) {
    return requestClient.request<boolean>(`${BASE}/removeTemplate`, {
      method: "post",
      params: { templateId },
    });
  },
};
