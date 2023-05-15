export const b64EncodeUnicode = (str: string) => {
  try {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1: any) {
        return String.fromCharCode(parseInt(`0x${p1}`, 16));
      })
    );
  } catch (e) {
    console.log('Error: getBase64Encode: error while encoding.');
    return null;
  }
};

export const b64DecodeUnicode = (str: string) => {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(str), function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
  } catch (e) {
    console.log('Error: getBase64Decode: error while decoding.');
    return null;
  }
};

export const logsErrorMessage = (code: number) => {
  const messages: any = {
    10001: 'ServerInternalError',
    20001: 'SearchSQLNotValid',
    20002: 'SearchStreamNotFound',
    20003: 'FullTextSearchFieldNotFound',
    20004: 'SearchFieldNotFound',
    20005: 'SearchFunctionNotDefined',
    20006: 'SearchParquetFileNotFound',
    20007: 'SearchFieldHasNoCompatibleDataType',
  };

  if (messages[code] !== undefined) {
    return 'message.' + messages[code];
  } else {
    return '';
  }
};
