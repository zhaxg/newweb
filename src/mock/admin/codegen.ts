import type { GenerateInput, GenerateOutput } from "@/api/admin/types";
import { API_BASE, getBody, getParams, ok, type RouteMap } from "./core";

const P = `${API_BASE}/codeGen`;

function pascal(s: string): string {
  return s.replace(/(^|[_-])(\w)/g, (_, __, c) => c.toUpperCase()).replace(/[_-]/g, "");
}

function genFiles(table: string, ns: string): GenerateOutput[] {
  const name = pascal(table || "hmx_user");
  return [
    {
      fileName: `${name}.types.ts`,
      content: `// 自动生成：${table} → ${ns}.${name}\nexport interface ${name} {\n  id: string;\n  // TODO: 由字段结构生成\n}\n`,
    },
    {
      fileName: `${name}Api.ts`,
      content: `import { requestClient } from "@/api/_core/request";\nimport type { ${name} } from "./${name}.types";\n\nconst BASE = "/${ns.toLowerCase()}/${table}";\n\nexport const ${name[0].toLowerCase()}${name.slice(1)}Api = {\n  list(keywords?: string) {\n    return requestClient.request<${name}[]>(\`\${BASE}/list\`, { method: "post", params: { keywords } });\n  },\n  save(data: ${name}) {\n    return requestClient.request<any>(\`\${BASE}/save\`, { method: "post", data });\n  },\n  remove(id?: string) {\n    return requestClient.request<any>(\`\${BASE}/remove\`, { method: "post", params: { id } });\n  },\n};\n`,
    },
    {
      fileName: `${name}List.vue`,
      content: `<script setup lang="ts">\n// 自动生成列表页：${name}\n</script>\n\n<template>\n  <div>${name} 列表</div>\n</template>\n`,
    },
  ];
}

export const codeGenRoutes: RouteMap = {
  [`post ${P}/generatedCode`]: (config) => {
    const input = getBody<GenerateInput>(config);
    return ok(config, genFiles(input.tableName ?? "hmx_user", input.nameSpace ?? "Hmx.Service.Admin.Entities"));
  },
  [`post ${P}/generateVueFiles`]: (config) => {
    const { swaggerJsonUri } = getParams(config);
    void swaggerJsonUri;
    return ok(config, genFiles("swagger_generated", "Hmx.Service.Admin.Entities"));
  },
};
