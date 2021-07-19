import { URL } from "url";
import { JsonApiParams } from "../types";

const JSON_API_OBJECT_KEYS = ["fields", "filter", "page"];
const JSON_API_ARRAY_VALUES = ["include", "sort", "fields"];


function parseValueForKey(key: string, value = "") {
  if (JSON_API_ARRAY_VALUES.includes(key)) {
    return value.split(",");
  }

  return value;
}

export function parse(url: string): JsonApiParams {
  const params = {};

  const nestedParamRegexp = new RegExp(/(\w+)\[(.*?)\]?$/);

  for (const param of new URL(url).searchParams) {
    const [paramKey, paramValue] = param;

    const nestedParam = nestedParamRegexp.exec(paramKey);

    if (nestedParam) {
      const [, key, nestedKey] = nestedParam;

      if (!(params[key] instanceof Object)) {
        params[key] = {};
      }

      if (paramValue !== "") {
        params[key][nestedKey] = parseValueForKey(key, paramValue);
      }
    } else {
      if (paramValue !== "") {
        const value = parseValueForKey(paramKey, paramValue);

        params[paramKey] = JSON_API_OBJECT_KEYS.includes(paramKey) ? { ...(value as any) } : value;
      }
    }
  }

  return params;
}

export function format(params: JsonApiParams) {
  return Object.keys(params).map((paramKey) => {
    if (JSON_API_OBJECT_KEYS.includes(paramKey)) {
      const param = params[paramKey];

      return Object.keys(param).map((objectKey) => {
        const value = paramKey === 'fields' ? param[objectKey].join(',') : param[objectKey];

        return `${paramKey}[${objectKey}]=${value}`
      }).join('&')
    } else {
      return `${paramKey}=${params[paramKey].join(',')}`
    }
  }).join('&');
}
