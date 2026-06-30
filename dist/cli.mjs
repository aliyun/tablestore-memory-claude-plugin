#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@tablestore/agent-storage/dist/src/core/errors/client-error.js
var OTSClientError;
var init_client_error = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/errors/client-error.js"() {
    OTSClientError = class extends Error {
      constructor(message) {
        super(message);
        this.name = "OTSClientError";
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/errors/service-error.js
var OTSServiceError;
var init_service_error = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/errors/service-error.js"() {
    OTSServiceError = class extends Error {
      statusCode;
      requestId;
      code;
      constructor(message, options) {
        super(message);
        this.name = "OTSServiceError";
        this.statusCode = options.statusCode;
        this.requestId = options.requestId;
        this.code = options.code;
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/auth/request-context.js
var RequestContext;
var init_request_context = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/auth/request-context.js"() {
    RequestContext = class {
      #credentials;
      #signDate;
      constructor(credentials, signDate) {
        this.#credentials = credentials;
        this.#signDate = signDate;
      }
      getCredentials() {
        return this.#credentials;
      }
      getSignDate() {
        return this.#signDate;
      }
      setSignDate(signDate) {
        this.#signDate = signDate;
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/auth/sign-base.js
import { createHmac } from "node:crypto";
function hmacSha1Base64(signingKey, content) {
  return createHmac("sha1", signingKey).update(content, "utf8").digest("base64");
}
function hmacSha256Base64(signingKey, content) {
  return createHmac("sha256", signingKey).update(content, "utf8").digest("base64");
}
function sortAndEncodeQuery(queryString) {
  if (!queryString) {
    return "";
  }
  const pairs = [...new URLSearchParams(queryString).entries()].sort(([leftKey, leftValue], [rightKey, rightValue]) => {
    const keyComparison = leftKey.localeCompare(rightKey);
    if (keyComparison !== 0) {
      return keyComparison;
    }
    return leftValue.localeCompare(rightValue);
  });
  return new URLSearchParams(pairs).toString();
}
function splitQuery(query) {
  const hashIndex = query.indexOf("#");
  const hashStripped = hashIndex >= 0 ? query.slice(0, hashIndex) : query;
  const queryIndex = hashStripped.indexOf("?");
  if (queryIndex < 0) {
    return {
      uri: hashStripped,
      queryString: ""
    };
  }
  return {
    uri: hashStripped.slice(0, queryIndex),
    queryString: hashStripped.slice(queryIndex + 1)
  };
}
var OTS_HEADER_PREFIX, SignBase;
var init_sign_base = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/auth/sign-base.js"() {
    init_client_error();
    OTS_HEADER_PREFIX = "x-ots-";
    SignBase = class {
      makeHeadersString(headers) {
        const headerItems = Object.entries(headers).filter(([key]) => key.toLowerCase().startsWith(OTS_HEADER_PREFIX)).map(([key, value]) => `${key.toLowerCase()}:${value.trim()}`).sort();
        return headerItems.join("\n");
      }
      getRequestSignatureString(query, headers) {
        const { uri, queryString } = splitQuery(query);
        const sortedQuery = sortAndEncodeQuery(queryString);
        const headersString = this.makeHeadersString(headers);
        return `${uri}
POST
${sortedQuery}
${headersString}
`;
      }
      makeResponseSignature(query, headers, signingKey) {
        const { uri } = splitQuery(query);
        const headersString = this.makeHeadersString(headers);
        return hmacSha1Base64(signingKey, `${headersString}
${uri}`);
      }
      requireSignDate(signDate) {
        if (!signDate) {
          throw new OTSClientError("v4 sign_date is None.");
        }
        return signDate;
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/auth/sign-v2.js
var SignV2;
var init_sign_v2 = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/auth/sign-v2.js"() {
    init_sign_base();
    SignV2 = class extends SignBase {
      getSigningKey(requestContext) {
        return requestContext.getCredentials().accessKeySecret;
      }
      makeRequestSignatureAndAddHeaders(query, headers, requestContext) {
        headers["x-ots-signature"] = hmacSha1Base64(this.getSigningKey(requestContext), this.getRequestSignatureString(query, headers));
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/auth/sign-v4.js
import { createHmac as createHmac2 } from "node:crypto";
function hmacSha256Bytes(signingKey, content) {
  return createHmac2("sha256", signingKey).update(content, "utf8").digest();
}
var V4_SIGNATURE_PRODUCT, V4_SIGNATURE_SEED, V4_SIGNATURE_PREFIX, V4_SIGNATURE_CONSTANT, V4_SIGNATURE_SALT, SignV4;
var init_sign_v4 = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/auth/sign-v4.js"() {
    init_client_error();
    init_sign_base();
    V4_SIGNATURE_PRODUCT = "ots";
    V4_SIGNATURE_SEED = "aliyun";
    V4_SIGNATURE_PREFIX = `${V4_SIGNATURE_SEED}_v4`;
    V4_SIGNATURE_CONSTANT = `${V4_SIGNATURE_SEED}_v4_request`;
    V4_SIGNATURE_SALT = "ots";
    SignV4 = class extends SignBase {
      signRegion;
      signDate;
      autoUpdateV4Sign;
      constructor(options) {
        super();
        if (!options.region) {
          throw new OTSClientError("region is not str or is empty.");
        }
        this.signRegion = options.region;
        this.signDate = options.signDate;
        this.autoUpdateV4Sign = options.autoUpdateV4Sign ?? options.signDate === void 0;
      }
      getAndSetV4SignDate(requestContext) {
        const currentDate = this.autoUpdateV4Sign ? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replaceAll("-", "") : this.signDate;
        const signDate = this.requireSignDate(currentDate);
        requestContext.setSignDate(signDate);
        return signDate;
      }
      getSigningKey(requestContext) {
        const accessKeySecret = requestContext.getCredentials().accessKeySecret;
        const signDate = this.requireSignDate(requestContext.getSignDate());
        const first = hmacSha256Bytes(`${V4_SIGNATURE_PREFIX}${accessKeySecret}`, signDate);
        const second = hmacSha256Bytes(first, this.signRegion);
        const third = hmacSha256Bytes(second, V4_SIGNATURE_PRODUCT);
        const fourth = hmacSha256Bytes(third, V4_SIGNATURE_CONSTANT);
        return Buffer.from(fourth.toString("base64"), "utf8");
      }
      makeRequestSignatureAndAddHeaders(query, headers, requestContext) {
        headers["x-ots-signdate"] = this.getAndSetV4SignDate(requestContext);
        headers["x-ots-signregion"] = this.signRegion;
        headers["x-ots-signaturev4"] = hmacSha256Base64(this.getSigningKey(requestContext), `${this.getRequestSignatureString(query, headers)}${V4_SIGNATURE_SALT}`);
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/models/unset.js
function isUnset(value) {
  return value === UNSET || value === void 0;
}
var UNSET;
var init_unset = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/models/unset.js"() {
    UNSET = /* @__PURE__ */ Symbol("UNSET");
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/models/enums.js
var MetadataFieldType, SearchType, RerankingType, RetrievalQueryType;
var init_enums = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/models/enums.js"() {
    (function(MetadataFieldType2) {
      MetadataFieldType2["STRING"] = "string";
      MetadataFieldType2["LONG"] = "long";
      MetadataFieldType2["DOUBLE"] = "double";
      MetadataFieldType2["BOOLEAN"] = "boolean";
      MetadataFieldType2["DATE"] = "date";
      MetadataFieldType2["STRING_LIST"] = "string_list";
      MetadataFieldType2["LONG_LIST"] = "long_list";
      MetadataFieldType2["DOUBLE_LIST"] = "double_list";
      MetadataFieldType2["BOOLEAN_LIST"] = "boolean_list";
      MetadataFieldType2["DATE_LIST"] = "date_list";
    })(MetadataFieldType || (MetadataFieldType = {}));
    (function(SearchType2) {
      SearchType2["DENSE_VECTOR"] = "DENSE_VECTOR";
      SearchType2["FULL_TEXT"] = "FULL_TEXT";
    })(SearchType || (SearchType = {}));
    (function(RerankingType2) {
      RerankingType2["RRF"] = "RRF";
      RerankingType2["MODEL"] = "MODEL";
      RerankingType2["WEIGHT"] = "WEIGHT";
    })(RerankingType || (RerankingType = {}));
    (function(RetrievalQueryType2) {
      RetrievalQueryType2["TEXT"] = "TEXT";
    })(RetrievalQueryType || (RetrievalQueryType = {}));
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/models/metadata-filter.js
var MetadataFilter, MetadataFilterBuilder;
var init_metadata_filter = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/models/metadata-filter.js"() {
    MetadataFilter = class _MetadataFilter {
      payload;
      constructor(payload) {
        this.payload = payload;
      }
      static equals(key, value) {
        return new _MetadataFilter({ equals: { key, value } });
      }
      static notEquals(key, value) {
        return new _MetadataFilter({ notEquals: { key, value } });
      }
      static greaterThan(key, value) {
        return new _MetadataFilter({ greaterThan: { key, value } });
      }
      static greaterThanOrEquals(key, value) {
        return new _MetadataFilter({ greaterThanOrEquals: { key, value } });
      }
      static lessThan(key, value) {
        return new _MetadataFilter({ lessThan: { key, value } });
      }
      static lessThanOrEquals(key, value) {
        return new _MetadataFilter({ lessThanOrEquals: { key, value } });
      }
      static inList(key, value) {
        return new _MetadataFilter({ in: { key, value } });
      }
      static notInList(key, value) {
        return new _MetadataFilter({ notIn: { key, value } });
      }
      static startsWith(key, value) {
        return new _MetadataFilter({ startsWith: { key, value } });
      }
      static stringContains(key, value) {
        return new _MetadataFilter({ stringContains: { key, value } });
      }
      static listContains(key, value) {
        return new _MetadataFilter({ listContains: { key, value } });
      }
      static andAll(...filters) {
        return new _MetadataFilter({ andAll: filters.map((filter) => filter.toJSONRequest()) });
      }
      static orAll(...filters) {
        return new _MetadataFilter({ orAll: filters.map((filter) => filter.toJSONRequest()) });
      }
      static notAll(...filters) {
        return new _MetadataFilter({ notAll: filters.map((filter) => filter.toJSONRequest()) });
      }
      static builder() {
        return new MetadataFilterBuilder();
      }
      toJSONRequest() {
        return this.payload;
      }
    };
    MetadataFilterBuilder = class {
      filters = [];
      add(filter) {
        this.filters.push(filter);
        return this;
      }
      equals(key, value) {
        return this.add(MetadataFilter.equals(key, value));
      }
      notEquals(key, value) {
        return this.add(MetadataFilter.notEquals(key, value));
      }
      greaterThan(key, value) {
        return this.add(MetadataFilter.greaterThan(key, value));
      }
      greaterThanOrEquals(key, value) {
        return this.add(MetadataFilter.greaterThanOrEquals(key, value));
      }
      lessThan(key, value) {
        return this.add(MetadataFilter.lessThan(key, value));
      }
      lessThanOrEquals(key, value) {
        return this.add(MetadataFilter.lessThanOrEquals(key, value));
      }
      inList(key, value) {
        return this.add(MetadataFilter.inList(key, value));
      }
      notInList(key, value) {
        return this.add(MetadataFilter.notInList(key, value));
      }
      startsWith(key, value) {
        return this.add(MetadataFilter.startsWith(key, value));
      }
      stringContains(key, value) {
        return this.add(MetadataFilter.stringContains(key, value));
      }
      listContains(key, value) {
        return this.add(MetadataFilter.listContains(key, value));
      }
      buildAnd() {
        return this.build("and");
      }
      buildOr() {
        return this.build("or");
      }
      buildNot() {
        return this.build("not");
      }
      build(operator) {
        if (this.filters.length === 0) {
          throw new Error(`Cannot build ${operator} filter with no conditions`);
        }
        if (this.filters.length === 1) {
          return this.filters[0];
        }
        if (operator === "and") {
          return MetadataFilter.andAll(...this.filters);
        }
        if (operator === "or") {
          return MetadataFilter.orAll(...this.filters);
        }
        return MetadataFilter.notAll(...this.filters);
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/models/base.js
function assignIfPresent(target, key, value) {
  if (!isUnset(value)) {
    target[key] = value;
  }
}
function toJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => toJsonValue(item));
  }
  if (value && typeof value === "object" && "toJSONRequest" in value && typeof value.toJSONRequest === "function") {
    return value.toJSONRequest();
  }
  return value;
}
var init_base = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/models/base.js"() {
    init_unset();
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/models/knowledge-base.js
var MetadataField, EmbeddingConfiguration, CreateKnowledgeBaseRequest, DeleteKnowledgeBaseRequest, DescribeKnowledgeBaseRequest, ListKnowledgeBaseRequest, UpdateKnowledgeBaseRequest;
var init_knowledge_base = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/models/knowledge-base.js"() {
    init_base();
    MetadataField = class {
      name;
      type;
      constructor(options) {
        this.name = options.name;
        this.type = options.type;
      }
      toJSONRequest() {
        return {
          name: this.name,
          type: this.type
        };
      }
    };
    EmbeddingConfiguration = class {
      provider;
      url;
      apiKey;
      model;
      dimension;
      constructor(options) {
        Object.assign(this, options);
      }
      toJSONRequest() {
        const result = {};
        assignIfPresent(result, "provider", this.provider);
        assignIfPresent(result, "url", this.url);
        assignIfPresent(result, "apiKey", this.apiKey);
        assignIfPresent(result, "model", this.model);
        assignIfPresent(result, "dimension", this.dimension);
        return result;
      }
    };
    CreateKnowledgeBaseRequest = class {
      knowledgeBaseName;
      description;
      subspace;
      tags;
      metadata;
      retrievalConfiguration;
      embeddingConfiguration;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
      }
      toJSONRequest() {
        const result = {
          knowledgeBaseName: this.knowledgeBaseName
        };
        assignIfPresent(result, "description", this.description);
        assignIfPresent(result, "subspace", this.subspace);
        assignIfPresent(result, "tags", this.tags);
        assignIfPresent(result, "metadata", this.metadata?.map((item) => item.toJSONRequest()));
        assignIfPresent(result, "retrievalConfiguration", toJsonValue(this.retrievalConfiguration));
        assignIfPresent(result, "embeddingConfiguration", toJsonValue(this.embeddingConfiguration));
        return result;
      }
    };
    DeleteKnowledgeBaseRequest = class {
      options;
      constructor(options) {
        this.options = options;
      }
      toJSONRequest() {
        return { knowledgeBaseName: this.options.knowledgeBaseName };
      }
    };
    DescribeKnowledgeBaseRequest = class {
      options;
      constructor(options) {
        this.options = options;
      }
      toJSONRequest() {
        return { knowledgeBaseName: this.options.knowledgeBaseName };
      }
    };
    ListKnowledgeBaseRequest = class {
      options;
      constructor(options = {}) {
        this.options = options;
      }
      toJSONRequest() {
        const result = {};
        assignIfPresent(result, "maxResults", this.options.maxResults);
        assignIfPresent(result, "nextToken", this.options.nextToken);
        return result;
      }
    };
    UpdateKnowledgeBaseRequest = class {
      knowledgeBaseName;
      description;
      tags;
      retrievalConfiguration;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
      }
      toJSONRequest() {
        const result = {
          knowledgeBaseName: this.knowledgeBaseName
        };
        assignIfPresent(result, "description", this.description);
        assignIfPresent(result, "tags", this.tags);
        assignIfPresent(result, "retrievalConfiguration", toJsonValue(this.retrievalConfiguration));
        return result;
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/models/document.js
var AddDocumentItem, UploadDocumentItem, DeleteDocumentItem, AddDocumentsRequest, UploadDocumentsRequest, GetDocumentRequest, ListDocumentsRequest, DeleteDocumentsRequest, UpdateDocumentRequest;
var init_document = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/models/document.js"() {
    init_base();
    AddDocumentItem = class {
      ossKey;
      metadata;
      inclusionFilters;
      exclusionFilters;
      constructor(options) {
        Object.assign(this, options);
        this.ossKey = options.ossKey;
      }
      toJSONRequest() {
        const result = { ossKey: this.ossKey };
        assignIfPresent(result, "metadata", this.metadata);
        assignIfPresent(result, "inclusionFilters", this.inclusionFilters);
        assignIfPresent(result, "exclusionFilters", this.exclusionFilters);
        return result;
      }
    };
    UploadDocumentItem = class {
      filePath;
      metadata;
      constructor(options) {
        Object.assign(this, options);
        this.filePath = options.filePath;
      }
      toJSONRequest() {
        const result = { filePath: this.filePath };
        assignIfPresent(result, "metadata", this.metadata);
        return result;
      }
    };
    DeleteDocumentItem = class {
      docId;
      ossKey;
      constructor(options) {
        Object.assign(this, options);
      }
      toJSONRequest() {
        const result = {};
        assignIfPresent(result, "docId", this.docId);
        assignIfPresent(result, "ossKey", this.ossKey);
        return result;
      }
    };
    AddDocumentsRequest = class {
      knowledgeBaseName;
      documents;
      subspace;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
        this.documents = options.documents;
      }
      toJSONRequest() {
        const result = {
          knowledgeBaseName: this.knowledgeBaseName,
          documents: this.documents.map((item) => item.toJSONRequest())
        };
        assignIfPresent(result, "subspace", this.subspace);
        return result;
      }
    };
    UploadDocumentsRequest = class {
      knowledgeBaseName;
      documents;
      subspace;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
        this.documents = options.documents;
      }
      toJSONRequest() {
        const result = {
          knowledgeBaseName: this.knowledgeBaseName,
          documents: this.documents.map((item) => item.toJSONRequest())
        };
        assignIfPresent(result, "subspace", this.subspace);
        return result;
      }
    };
    GetDocumentRequest = class {
      knowledgeBaseName;
      docId;
      ossKey;
      subspace;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
      }
      toJSONRequest() {
        const result = { knowledgeBaseName: this.knowledgeBaseName };
        assignIfPresent(result, "docId", this.docId);
        assignIfPresent(result, "ossKey", this.ossKey);
        assignIfPresent(result, "subspace", this.subspace);
        return result;
      }
    };
    ListDocumentsRequest = class {
      knowledgeBaseName;
      subspace;
      maxResults;
      nextToken;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
      }
      toJSONRequest() {
        const result = { knowledgeBaseName: this.knowledgeBaseName };
        assignIfPresent(result, "subspace", this.subspace);
        assignIfPresent(result, "maxResults", this.maxResults);
        assignIfPresent(result, "nextToken", this.nextToken);
        return result;
      }
    };
    DeleteDocumentsRequest = class {
      knowledgeBaseName;
      documents;
      subspace;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
        this.documents = options.documents;
      }
      toJSONRequest() {
        const result = {
          knowledgeBaseName: this.knowledgeBaseName,
          documents: this.documents.map((item) => item.toJSONRequest())
        };
        assignIfPresent(result, "subspace", this.subspace);
        return result;
      }
    };
    UpdateDocumentRequest = class {
      knowledgeBaseName;
      subspace;
      ossKey;
      docId;
      metadata;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
      }
      toJSONRequest() {
        const result = { knowledgeBaseName: this.knowledgeBaseName };
        assignIfPresent(result, "subspace", this.subspace);
        assignIfPresent(result, "ossKey", this.ossKey);
        assignIfPresent(result, "docId", this.docId);
        assignIfPresent(result, "metadata", this.metadata);
        return result;
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/models/chunk.js
var UpdateChunkItem, UpdateChunksRequest, ListChunksRequest;
var init_chunk = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/models/chunk.js"() {
    init_base();
    UpdateChunkItem = class {
      chunkId;
      docId;
      ossKey;
      title;
      content;
      status;
      constructor(options) {
        Object.assign(this, options);
        this.chunkId = options.chunkId;
      }
      toJSONRequest() {
        const result = { chunkId: this.chunkId };
        assignIfPresent(result, "docId", this.docId);
        assignIfPresent(result, "ossKey", this.ossKey);
        assignIfPresent(result, "title", this.title);
        assignIfPresent(result, "content", this.content);
        assignIfPresent(result, "status", this.status);
        return result;
      }
    };
    UpdateChunksRequest = class {
      knowledgeBaseName;
      chunks;
      subspace;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
        this.chunks = options.chunks;
      }
      toJSONRequest() {
        const result = {
          knowledgeBaseName: this.knowledgeBaseName,
          chunks: this.chunks.map((item) => item.toJSONRequest())
        };
        assignIfPresent(result, "subspace", this.subspace);
        return result;
      }
    };
    ListChunksRequest = class {
      knowledgeBaseName;
      subspace;
      docId;
      ossKey;
      maxResults;
      nextToken;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
      }
      toJSONRequest() {
        const result = { knowledgeBaseName: this.knowledgeBaseName };
        assignIfPresent(result, "subspace", this.subspace);
        assignIfPresent(result, "docId", this.docId);
        assignIfPresent(result, "ossKey", this.ossKey);
        assignIfPresent(result, "maxResults", this.maxResults);
        assignIfPresent(result, "nextToken", this.nextToken);
        return result;
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/models/retrieve.js
var RetrievalQuery, DenseVectorSearchConfiguration, FullTextSearchConfiguration, RRFConfiguration, ModelConfiguration, WeightConfiguration, RerankingConfiguration, RetrievalConfiguration, RetrieveRequest;
var init_retrieve = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/models/retrieve.js"() {
    init_base();
    init_enums();
    RetrievalQuery = class {
      text;
      type;
      constructor(options) {
        this.text = options.text;
        this.type = options.type ?? RetrievalQueryType.TEXT;
      }
      toJSONRequest() {
        return {
          text: this.text,
          type: this.type
        };
      }
    };
    DenseVectorSearchConfiguration = class {
      options;
      constructor(options = {}) {
        this.options = options;
      }
      toJSONRequest() {
        return { numberOfResults: this.options.numberOfResults ?? 20 };
      }
    };
    FullTextSearchConfiguration = class {
      options;
      constructor(options = {}) {
        this.options = options;
      }
      toJSONRequest() {
        return { numberOfResults: this.options.numberOfResults ?? 20 };
      }
    };
    RRFConfiguration = class {
      denseVectorSearchWeight;
      fullTextSearchWeight;
      k;
      constructor(options = {}) {
        this.denseVectorSearchWeight = options.denseVectorSearchWeight ?? 1;
        this.fullTextSearchWeight = options.fullTextSearchWeight ?? 1;
        this.k = options.k ?? 60;
      }
      toJSONRequest() {
        return {
          denseVectorSearchWeight: this.denseVectorSearchWeight,
          fullTextSearchWeight: this.fullTextSearchWeight,
          k: this.k
        };
      }
    };
    ModelConfiguration = class {
      provider;
      model;
      constructor(options = {}) {
        Object.assign(this, options);
      }
      toJSONRequest() {
        const result = {};
        assignIfPresent(result, "provider", this.provider);
        assignIfPresent(result, "model", this.model);
        return result;
      }
    };
    WeightConfiguration = class {
      denseVectorSearchWeight;
      fullTextSearchWeight;
      constructor(options = {}) {
        Object.assign(this, options);
      }
      toJSONRequest() {
        const result = {};
        assignIfPresent(result, "denseVectorSearchWeight", this.denseVectorSearchWeight);
        assignIfPresent(result, "fullTextSearchWeight", this.fullTextSearchWeight);
        return result;
      }
    };
    RerankingConfiguration = class {
      type;
      numberOfResults;
      rrfConfiguration;
      modelConfiguration;
      weightConfiguration;
      constructor(options = {}) {
        this.type = options.type ?? RerankingType.RRF;
        this.numberOfResults = options.numberOfResults ?? 20;
        this.rrfConfiguration = options.rrfConfiguration;
        this.modelConfiguration = options.modelConfiguration;
        this.weightConfiguration = options.weightConfiguration;
      }
      toJSONRequest() {
        const result = {
          type: this.type,
          numberOfResults: this.numberOfResults
        };
        assignIfPresent(result, "rrfConfiguration", toJsonValue(this.rrfConfiguration));
        assignIfPresent(result, "modelConfiguration", toJsonValue(this.modelConfiguration));
        assignIfPresent(result, "weightConfiguration", toJsonValue(this.weightConfiguration));
        return result;
      }
    };
    RetrievalConfiguration = class {
      searchType;
      denseVectorSearchConfiguration;
      fullTextSearchConfiguration;
      rerankingConfiguration;
      filter;
      constructor(options = {}) {
        Object.assign(this, options);
      }
      toJSONRequest() {
        const result = {};
        assignIfPresent(result, "searchType", this.searchType);
        assignIfPresent(result, "denseVectorSearchConfiguration", toJsonValue(this.denseVectorSearchConfiguration));
        assignIfPresent(result, "fullTextSearchConfiguration", toJsonValue(this.fullTextSearchConfiguration));
        assignIfPresent(result, "rerankingConfiguration", toJsonValue(this.rerankingConfiguration));
        assignIfPresent(result, "filter", toJsonValue(this.filter));
        return result;
      }
    };
    RetrieveRequest = class {
      knowledgeBaseName;
      retrievalQuery;
      subspace;
      retrievalConfiguration;
      constructor(options) {
        Object.assign(this, options);
        this.knowledgeBaseName = options.knowledgeBaseName;
        this.retrievalQuery = options.retrievalQuery;
      }
      toJSONRequest() {
        const result = {
          knowledgeBaseName: this.knowledgeBaseName,
          retrievalQuery: this.retrievalQuery.toJSONRequest()
        };
        assignIfPresent(result, "subspace", this.subspace);
        assignIfPresent(result, "retrievalConfiguration", toJsonValue(this.retrievalConfiguration));
        return result;
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/models/memory.js
var Scope, MessagePayload, CreateMemoryStoreRequest, GetMemoryStoreRequest, ListMemoryStoresRequest, UpdateMemoryStoreRequest, DeleteMemoryStoreRequest, AddMemoriesRequest, SearchMemoriesRequest, ListMemoriesRequest, GetMemoryRequest, UpdateMemoryRequest, DeleteMemoryRequest, ListMemoryStoreMessagesRequest, ListMemoryStoreRequestsRequest, GetMemoryTaskRequest, ListMemoryTasksRequest, ListMemoryStoreScopesRequest, CreateMemoryDreamTaskRequest, GetMemoryDreamTaskRequest, ListMemoryDreamTasksRequest, CancelMemoryDreamTaskRequest, ListMemoryDreamActionsRequest, ApplyMemoryDreamActionsRequest;
var init_memory = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/models/memory.js"() {
    init_base();
    Scope = class {
      appId;
      tenantId;
      agentId;
      runId;
      constructor(options) {
        Object.assign(this, options);
      }
      toJSONRequest() {
        const result = {};
        if (this.appId !== void 0) {
          result.appId = this.appId;
        }
        if (this.tenantId !== void 0) {
          result.tenantId = this.tenantId;
        }
        if (this.agentId !== void 0) {
          result.agentId = this.agentId;
        }
        if (this.runId !== void 0) {
          result.runId = this.runId;
        }
        return result;
      }
    };
    MessagePayload = class {
      role;
      content;
      messageId;
      timestamp;
      metadata;
      constructor(options) {
        Object.assign(this, options);
        this.role = options.role;
        this.content = options.content;
      }
      toJSONRequest() {
        const result = {
          role: this.role,
          content: this.content
        };
        if (this.messageId !== void 0) {
          result.messageId = this.messageId;
        }
        if (this.timestamp !== void 0) {
          result.timestamp = this.timestamp;
        }
        if (this.metadata !== void 0) {
          result.metadata = this.metadata;
        }
        return result;
      }
    };
    CreateMemoryStoreRequest = class {
      memoryStoreName;
      description;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
      }
      toJSONRequest() {
        const result = { memoryStoreName: this.memoryStoreName };
        assignIfPresent(result, "description", this.description);
        return result;
      }
    };
    GetMemoryStoreRequest = class {
      options;
      constructor(options) {
        this.options = options;
      }
      toJSONRequest() {
        return { memoryStoreName: this.options.memoryStoreName };
      }
    };
    ListMemoryStoresRequest = class {
      options;
      constructor(options = {}) {
        this.options = options;
      }
      toJSONRequest() {
        const result = {};
        assignIfPresent(result, "limit", this.options.limit);
        assignIfPresent(result, "nextToken", this.options.nextToken);
        return result;
      }
    };
    UpdateMemoryStoreRequest = class {
      memoryStoreName;
      description;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
      }
      toJSONRequest() {
        const result = { memoryStoreName: this.memoryStoreName };
        assignIfPresent(result, "description", this.description);
        return result;
      }
    };
    DeleteMemoryStoreRequest = class {
      options;
      constructor(options) {
        this.options = options;
      }
      toJSONRequest() {
        return { memoryStoreName: this.options.memoryStoreName };
      }
    };
    AddMemoriesRequest = class {
      memoryStoreName;
      scope;
      messages;
      text;
      metadata;
      sync;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
      }
      toJSONRequest() {
        const result = { memoryStoreName: this.memoryStoreName };
        assignIfPresent(result, "scope", toJsonValue(this.scope));
        assignIfPresent(result, "messages", this.messages?.map((item) => toJsonValue(item)));
        assignIfPresent(result, "text", this.text);
        assignIfPresent(result, "metadata", this.metadata);
        assignIfPresent(result, "sync", this.sync);
        return result;
      }
    };
    SearchMemoriesRequest = class {
      memoryStoreName;
      scope;
      query;
      metadata;
      topK;
      enableRerank;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.query = options.query;
      }
      toJSONRequest() {
        const result = {
          memoryStoreName: this.memoryStoreName,
          query: this.query
        };
        assignIfPresent(result, "scope", toJsonValue(this.scope));
        assignIfPresent(result, "metadata", this.metadata);
        assignIfPresent(result, "topK", this.topK);
        assignIfPresent(result, "enableRerank", this.enableRerank);
        return result;
      }
    };
    ListMemoriesRequest = class {
      memoryStoreName;
      scope;
      limit;
      nextToken;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
      }
      toJSONRequest() {
        const result = { memoryStoreName: this.memoryStoreName };
        assignIfPresent(result, "scope", toJsonValue(this.scope));
        assignIfPresent(result, "limit", this.limit);
        assignIfPresent(result, "nextToken", this.nextToken);
        return result;
      }
    };
    GetMemoryRequest = class {
      memoryStoreName;
      memoryId;
      scope;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.memoryId = options.memoryId;
        this.scope = options.scope;
      }
      toJSONRequest() {
        return {
          memoryStoreName: this.memoryStoreName,
          memoryId: this.memoryId,
          scope: toJsonValue(this.scope)
        };
      }
    };
    UpdateMemoryRequest = class {
      memoryStoreName;
      memoryId;
      scope;
      text;
      metadata;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.memoryId = options.memoryId;
        this.scope = options.scope;
      }
      toJSONRequest() {
        const result = {
          memoryStoreName: this.memoryStoreName,
          memoryId: this.memoryId,
          scope: toJsonValue(this.scope)
        };
        assignIfPresent(result, "text", this.text);
        assignIfPresent(result, "metadata", this.metadata);
        return result;
      }
    };
    DeleteMemoryRequest = class {
      memoryStoreName;
      memoryId;
      scope;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.memoryId = options.memoryId;
        this.scope = options.scope;
      }
      toJSONRequest() {
        return {
          memoryStoreName: this.memoryStoreName,
          memoryId: this.memoryId,
          scope: toJsonValue(this.scope)
        };
      }
    };
    ListMemoryStoreMessagesRequest = class {
      memoryStoreName;
      scope;
      limit;
      nextToken;
      minTimestamp;
      maxTimestamp;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.scope = options.scope;
      }
      toJSONRequest() {
        const result = {
          memoryStoreName: this.memoryStoreName,
          scope: toJsonValue(this.scope)
        };
        assignIfPresent(result, "limit", this.limit);
        assignIfPresent(result, "nextToken", this.nextToken);
        assignIfPresent(result, "minTimestamp", this.minTimestamp);
        assignIfPresent(result, "maxTimestamp", this.maxTimestamp);
        return result;
      }
    };
    ListMemoryStoreRequestsRequest = class {
      memoryStoreName;
      scope;
      limit;
      nextToken;
      operation;
      minTimestamp;
      maxTimestamp;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
      }
      toJSONRequest() {
        const result = { memoryStoreName: this.memoryStoreName };
        assignIfPresent(result, "scope", toJsonValue(this.scope));
        assignIfPresent(result, "limit", this.limit);
        assignIfPresent(result, "nextToken", this.nextToken);
        assignIfPresent(result, "operation", this.operation);
        assignIfPresent(result, "minTimestamp", this.minTimestamp);
        assignIfPresent(result, "maxTimestamp", this.maxTimestamp);
        return result;
      }
    };
    GetMemoryTaskRequest = class {
      memoryStoreName;
      requestId;
      scope;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.requestId = options.requestId;
      }
      toJSONRequest() {
        const result = {
          memoryStoreName: this.memoryStoreName,
          requestId: this.requestId
        };
        assignIfPresent(result, "scope", toJsonValue(this.scope));
        return result;
      }
    };
    ListMemoryTasksRequest = class {
      memoryStoreName;
      scope;
      status;
      limit;
      nextToken;
      minTimestamp;
      maxTimestamp;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.scope = options.scope;
      }
      toJSONRequest() {
        const result = {
          memoryStoreName: this.memoryStoreName,
          scope: toJsonValue(this.scope)
        };
        assignIfPresent(result, "status", this.status);
        assignIfPresent(result, "limit", this.limit);
        assignIfPresent(result, "nextToken", this.nextToken);
        assignIfPresent(result, "minTimestamp", this.minTimestamp);
        assignIfPresent(result, "maxTimestamp", this.maxTimestamp);
        return result;
      }
    };
    ListMemoryStoreScopesRequest = class {
      memoryStoreName;
      scope;
      limit;
      nextToken;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.scope = options.scope;
      }
      toJSONRequest() {
        const result = {
          memoryStoreName: this.memoryStoreName,
          scope: toJsonValue(this.scope)
        };
        assignIfPresent(result, "limit", this.limit);
        assignIfPresent(result, "nextToken", this.nextToken);
        return result;
      }
    };
    CreateMemoryDreamTaskRequest = class {
      memoryStoreName;
      scopes;
      minTimestamp;
      maxTimestamp;
      maxSessions;
      maxMessages;
      maxMemories;
      expandedScopeLimit;
      scopeOutputMode;
      applyMode;
      confidenceThresholds;
      instructions;
      clientToken;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.scopes = options.scopes;
      }
      toJSONRequest() {
        const result = {
          memoryStoreName: this.memoryStoreName,
          scopes: this.scopes.map((item) => toJsonValue(item))
        };
        assignIfPresent(result, "minTimestamp", this.minTimestamp);
        assignIfPresent(result, "maxTimestamp", this.maxTimestamp);
        assignIfPresent(result, "maxSessions", this.maxSessions);
        assignIfPresent(result, "maxMessages", this.maxMessages);
        assignIfPresent(result, "maxMemories", this.maxMemories);
        assignIfPresent(result, "expandedScopeLimit", this.expandedScopeLimit);
        assignIfPresent(result, "scopeOutputMode", this.scopeOutputMode);
        assignIfPresent(result, "applyMode", this.applyMode);
        assignIfPresent(result, "confidenceThresholds", this.confidenceThresholds);
        assignIfPresent(result, "instructions", this.instructions);
        assignIfPresent(result, "clientToken", this.clientToken);
        return result;
      }
    };
    GetMemoryDreamTaskRequest = class {
      memoryStoreName;
      dreamId;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.dreamId = options.dreamId;
      }
      toJSONRequest() {
        return {
          memoryStoreName: this.memoryStoreName,
          dreamId: this.dreamId
        };
      }
    };
    ListMemoryDreamTasksRequest = class {
      memoryStoreName;
      scope;
      status;
      minTimestamp;
      maxTimestamp;
      limit;
      nextToken;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.scope = options.scope;
      }
      toJSONRequest() {
        const result = {
          memoryStoreName: this.memoryStoreName,
          scope: toJsonValue(this.scope)
        };
        assignIfPresent(result, "status", this.status);
        assignIfPresent(result, "minTimestamp", this.minTimestamp);
        assignIfPresent(result, "maxTimestamp", this.maxTimestamp);
        assignIfPresent(result, "limit", this.limit);
        assignIfPresent(result, "nextToken", this.nextToken);
        return result;
      }
    };
    CancelMemoryDreamTaskRequest = class {
      memoryStoreName;
      dreamId;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.dreamId = options.dreamId;
      }
      toJSONRequest() {
        return {
          memoryStoreName: this.memoryStoreName,
          dreamId: this.dreamId
        };
      }
    };
    ListMemoryDreamActionsRequest = class {
      memoryStoreName;
      dreamId;
      status;
      action;
      targetScope;
      sourceMemoryId;
      minConfidence;
      maxConfidence;
      orderBy;
      limit;
      nextToken;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.dreamId = options.dreamId;
      }
      toJSONRequest() {
        const result = {
          memoryStoreName: this.memoryStoreName,
          dreamId: this.dreamId
        };
        assignIfPresent(result, "status", this.status);
        assignIfPresent(result, "action", this.action);
        assignIfPresent(result, "targetScope", toJsonValue(this.targetScope));
        assignIfPresent(result, "sourceMemoryId", this.sourceMemoryId);
        assignIfPresent(result, "minConfidence", this.minConfidence);
        assignIfPresent(result, "maxConfidence", this.maxConfidence);
        assignIfPresent(result, "orderBy", this.orderBy);
        assignIfPresent(result, "limit", this.limit);
        assignIfPresent(result, "nextToken", this.nextToken);
        return result;
      }
    };
    ApplyMemoryDreamActionsRequest = class {
      memoryStoreName;
      dreamId;
      actionIds;
      applier;
      constructor(options) {
        Object.assign(this, options);
        this.memoryStoreName = options.memoryStoreName;
        this.dreamId = options.dreamId;
        this.actionIds = options.actionIds;
      }
      toJSONRequest() {
        const result = {
          memoryStoreName: this.memoryStoreName,
          dreamId: this.dreamId,
          actionIds: this.actionIds
        };
        assignIfPresent(result, "applier", this.applier);
        return result;
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/serialization/to-json-request.js
function toJSONRequest(value) {
  if (value && typeof value === "object" && "toJSONRequest" in value && typeof value.toJSONRequest === "function") {
    return value.toJSONRequest();
  }
  return value;
}
var init_to_json_request = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/serialization/to-json-request.js"() {
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/http/md5.js
import { createHash } from "node:crypto";
function md5Base64(content) {
  const hash = createHash("md5");
  hash.update(content);
  return hash.digest("base64");
}
var init_md5 = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/http/md5.js"() {
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/version.js
var SDK_VERSION, DEFAULT_USER_AGENT;
var init_version = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/version.js"() {
    SDK_VERSION = "0.0.8";
    DEFAULT_USER_AGENT = `@tablestore/agent-storage/${SDK_VERSION}`;
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/http/headers.js
function buildDateHeader(date = /* @__PURE__ */ new Date()) {
  const iso = date.toISOString();
  return `${iso.slice(0, 19)}.000Z`;
}
function buildRequestHeaders(options) {
  const headers = {
    "x-ots-date": buildDateHeader(options.date),
    "x-ots-apiversion": API_VERSION,
    "x-ots-accesskeyid": options.credentials.accessKeyId,
    "x-ots-instancename": options.instanceName,
    "x-ots-contentmd5": md5Base64(options.body)
  };
  if (options.credentials.securityToken) {
    headers["x-ots-ststoken"] = options.credentials.securityToken;
  }
  if (options.extraHeaders) {
    for (const [key, value] of Object.entries(options.extraHeaders)) {
      headers[key] = value;
    }
  }
  options.signer.makeRequestSignatureAndAddHeaders(options.query, headers, options.requestContext);
  headers["User-Agent"] = options.userAgent ?? DEFAULT_USER_AGENT;
  return headers;
}
var API_VERSION;
var init_headers = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/http/headers.js"() {
    init_md5();
    init_version();
    API_VERSION = "2015-12-31";
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/http/ots-json-client.js
function normalizeHeaders(headers) {
  const normalized = {};
  headers.forEach((value, key) => {
    normalized[key.toLowerCase()] = value;
  });
  return normalized;
}
var OTSJSONClient;
var init_ots_json_client = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/http/ots-json-client.js"() {
    init_client_error();
    init_service_error();
    init_sign_v2();
    init_sign_v4();
    init_headers();
    init_md5();
    init_request_context();
    init_version();
    OTSJSONClient = class {
      endpoint;
      instanceName;
      credentials;
      apiKey;
      fetchImpl;
      signer;
      userAgent;
      extraHeaders;
      constructor(options) {
        if (!options.credentials && !options.apiKey) {
          throw new OTSClientError("Either credentials (accessKeyId/accessKeySecret) or apiKey must be provided.");
        }
        if (options.apiKey && !options.endpoint.startsWith("https://")) {
          throw new OTSClientError("API key authentication requires HTTPS. Endpoint must start with https://.");
        }
        this.endpoint = options.endpoint.replace(/\/+$/, "");
        this.instanceName = options.instanceName;
        this.credentials = options.credentials;
        this.apiKey = options.apiKey;
        this.fetchImpl = options.fetch;
        this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
        this.extraHeaders = options.extraHeaders;
        if (options.credentials) {
          this.signer = (options.signVersion ?? "v2") === "v4" ? new SignV4({ region: options.region }) : new SignV2();
        }
      }
      async request(action, payload) {
        if (!this.fetchImpl) {
          throw new OTSClientError("fetch implementation is required.");
        }
        const body = JSON.stringify(payload);
        let headers;
        let requestContext;
        if (this.apiKey) {
          headers = {
            "x-ots-instancename": this.instanceName,
            "x-ots-apikey": this.apiKey,
            "Content-Type": "application/json",
            "User-Agent": this.userAgent
          };
          if (this.extraHeaders) {
            for (const [key, value] of Object.entries(this.extraHeaders)) {
              headers[key] = value;
            }
          }
        } else {
          requestContext = new RequestContext(this.credentials);
          headers = buildRequestHeaders({
            body: new TextEncoder().encode(body),
            query: `/${action}`,
            instanceName: this.instanceName,
            credentials: this.credentials,
            signer: this.signer,
            requestContext,
            userAgent: this.userAgent,
            extraHeaders: this.extraHeaders
          });
          headers["Content-Type"] = "application/json";
        }
        let response;
        try {
          response = await this.fetchImpl(`${this.endpoint}/${action}`, {
            method: "POST",
            headers,
            body
          });
        } catch (error) {
          throw new OTSClientError(`Failed to send request: ${String(error)}`);
        }
        const responseText = await response.text();
        const responseBytes = new TextEncoder().encode(responseText);
        const responseHeaders = normalizeHeaders(response.headers);
        if (!this.apiKey) {
          this.validateResponseHeaders(responseHeaders, responseBytes, response.status, requestContext, `/${action}`);
        }
        if (!response.ok) {
          let errorPayload = {};
          try {
            errorPayload = responseText ? JSON.parse(responseText) : {};
          } catch {
            errorPayload = {};
          }
          throw new OTSServiceError(String(errorPayload.message ?? response.statusText), {
            statusCode: response.status,
            requestId: responseHeaders["x-ots-requestid"],
            code: typeof errorPayload.code === "string" ? errorPayload.code : void 0
          });
        }
        try {
          return JSON.parse(responseText);
        } catch (error) {
          throw new OTSClientError(`Failed to parse JSON response: ${String(error)}`);
        }
      }
      validateResponseHeaders(headers, body, status, requestContext, query) {
        if (status >= 200 && status < 300) {
          for (const header of ["x-ots-contentmd5", "x-ots-requestid", "x-ots-date", "x-ots-contenttype"]) {
            if (!(header in headers)) {
              throw new OTSClientError(`"${header}" is missing in response header.`);
            }
          }
        }
        if (headers["x-ots-contentmd5"] && md5Base64(body) !== headers["x-ots-contentmd5"]) {
          throw new OTSClientError("MD5 mismatch in response.");
        }
        const authorization = headers.authorization;
        if (!authorization) {
          if (status >= 200 && status < 300) {
            throw new OTSClientError('"Authorization" is missing in response header.');
          }
          return;
        }
        if (!authorization.startsWith("OTS ")) {
          throw new OTSClientError("Invalid Authorization in response.");
        }
        const [accessKeyId, signature] = authorization.slice(4).split(":");
        if (accessKeyId !== this.credentials.accessKeyId) {
          throw new OTSClientError("Invalid access key id in response.");
        }
        if (signature !== this.signer.makeResponseSignature(query, headers, this.signer.getSigningKey(requestContext))) {
          throw new OTSClientError("Invalid signature in response.");
        }
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/core/client/agent-storage-client.js
var AgentStorageClient;
var init_agent_storage_client = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/core/client/agent-storage-client.js"() {
    init_ots_json_client();
    init_version();
    init_to_json_request();
    AgentStorageClient = class {
      client;
      constructor(options) {
        const fetchImpl = options.fetch ?? globalThis.fetch;
        const userAgent = options.userAgentSuffix ? `${DEFAULT_USER_AGENT} ${options.userAgentSuffix}` : DEFAULT_USER_AGENT;
        this.client = new OTSJSONClient({
          endpoint: options.endpoint,
          instanceName: options.instanceName,
          credentials: options.accessKeyId && options.accessKeySecret ? {
            accessKeyId: options.accessKeyId,
            accessKeySecret: options.accessKeySecret,
            securityToken: options.stsToken
          } : void 0,
          apiKey: options.apiKey,
          signVersion: options.signVersion ?? "v2",
          region: options.region,
          fetch: fetchImpl,
          userAgent,
          extraHeaders: options.extraHeaders
        });
      }
      createKnowledgeBase(request) {
        return this.client.request("CreateKnowledgeBase", toJSONRequest(request));
      }
      deleteKnowledgeBase(request) {
        return this.client.request("DeleteKnowledgeBase", toJSONRequest(request));
      }
      describeKnowledgeBase(request) {
        return this.client.request("DescribeKnowledgeBase", toJSONRequest(request));
      }
      listKnowledgeBase(request = {}) {
        return this.client.request("ListKnowledgeBase", toJSONRequest(request));
      }
      updateKnowledgeBase(request) {
        return this.client.request("UpdateKnowledgeBase", toJSONRequest(request));
      }
      addDocuments(request) {
        return this.client.request("AddDocuments", toJSONRequest(request));
      }
      updateDocument(request) {
        return this.client.request("UpdateDocument", toJSONRequest(request));
      }
      getDocument(request) {
        return this.client.request("GetDocument", toJSONRequest(request));
      }
      listDocuments(request) {
        return this.client.request("ListDocuments", toJSONRequest(request));
      }
      deleteDocuments(request) {
        return this.client.request("DeleteDocuments", toJSONRequest(request));
      }
      retrieve(request) {
        return this.client.request("Retrieve", toJSONRequest(request));
      }
      listChunks(request) {
        return this.client.request("ListChunks", toJSONRequest(request));
      }
      updateChunks(request) {
        return this.client.request("UpdateChunks", toJSONRequest(request));
      }
      createMemoryStore(request) {
        return this.client.request("CreateMemoryStore", toJSONRequest(request));
      }
      getMemoryStore(request) {
        return this.client.request("GetMemoryStore", toJSONRequest(request));
      }
      listMemoryStores(request = {}) {
        return this.client.request("ListMemoryStores", toJSONRequest(request));
      }
      updateMemoryStore(request) {
        return this.client.request("UpdateMemoryStore", toJSONRequest(request));
      }
      deleteMemoryStore(request) {
        return this.client.request("DeleteMemoryStore", toJSONRequest(request));
      }
      addMemories(request) {
        return this.client.request("AddMemories", toJSONRequest(request));
      }
      searchMemories(request) {
        return this.client.request("SearchMemories", toJSONRequest(request));
      }
      listMemories(request) {
        return this.client.request("ListMemories", toJSONRequest(request));
      }
      getMemory(request) {
        return this.client.request("GetMemory", toJSONRequest(request));
      }
      updateMemory(request) {
        return this.client.request("UpdateMemory", toJSONRequest(request));
      }
      deleteMemory(request) {
        return this.client.request("DeleteMemory", toJSONRequest(request));
      }
      listMemoryStoreMessages(request) {
        return this.client.request("ListMemoryStoreMessages", toJSONRequest(request));
      }
      listMemoryStoreRequests(request) {
        return this.client.request("ListMemoryStoreRequests", toJSONRequest(request));
      }
      getMemoryTask(request) {
        return this.client.request("GetMemoryTask", toJSONRequest(request));
      }
      listMemoryTasks(request) {
        return this.client.request("ListMemoryTasks", toJSONRequest(request));
      }
      listMemoryStoreScopes(request) {
        return this.client.request("ListMemoryStoreScopes", toJSONRequest(request));
      }
      createMemoryDreamTask(request) {
        return this.client.request("CreateMemoryDreamTask", toJSONRequest(request));
      }
      getMemoryDreamTask(request) {
        return this.client.request("GetMemoryDreamTask", toJSONRequest(request));
      }
      listMemoryDreamTasks(request) {
        return this.client.request("ListMemoryDreamTasks", toJSONRequest(request));
      }
      cancelMemoryDreamTask(request) {
        return this.client.request("CancelMemoryDreamTask", toJSONRequest(request));
      }
      listMemoryDreamActions(request) {
        return this.client.request("ListMemoryDreamActions", toJSONRequest(request));
      }
      applyMemoryDreamActions(request) {
        return this.client.request("ApplyMemoryDreamActions", toJSONRequest(request));
      }
      uploadDocuments(_request) {
        throw new Error("uploadDocuments is only available in the NodeAgentStorageClient.");
      }
    };
  }
});

// node_modules/@tablestore/agent-storage/dist/src/index.js
var src_exports = {};
__export(src_exports, {
  AddDocumentItem: () => AddDocumentItem,
  AddDocumentsRequest: () => AddDocumentsRequest,
  AddMemoriesRequest: () => AddMemoriesRequest,
  AgentStorageClient: () => AgentStorageClient,
  ApplyMemoryDreamActionsRequest: () => ApplyMemoryDreamActionsRequest,
  CancelMemoryDreamTaskRequest: () => CancelMemoryDreamTaskRequest,
  CreateKnowledgeBaseRequest: () => CreateKnowledgeBaseRequest,
  CreateMemoryDreamTaskRequest: () => CreateMemoryDreamTaskRequest,
  CreateMemoryStoreRequest: () => CreateMemoryStoreRequest,
  DeleteDocumentItem: () => DeleteDocumentItem,
  DeleteDocumentsRequest: () => DeleteDocumentsRequest,
  DeleteKnowledgeBaseRequest: () => DeleteKnowledgeBaseRequest,
  DeleteMemoryRequest: () => DeleteMemoryRequest,
  DeleteMemoryStoreRequest: () => DeleteMemoryStoreRequest,
  DenseVectorSearchConfiguration: () => DenseVectorSearchConfiguration,
  DescribeKnowledgeBaseRequest: () => DescribeKnowledgeBaseRequest,
  EmbeddingConfiguration: () => EmbeddingConfiguration,
  FullTextSearchConfiguration: () => FullTextSearchConfiguration,
  GetDocumentRequest: () => GetDocumentRequest,
  GetMemoryDreamTaskRequest: () => GetMemoryDreamTaskRequest,
  GetMemoryRequest: () => GetMemoryRequest,
  GetMemoryStoreRequest: () => GetMemoryStoreRequest,
  GetMemoryTaskRequest: () => GetMemoryTaskRequest,
  ListChunksRequest: () => ListChunksRequest,
  ListDocumentsRequest: () => ListDocumentsRequest,
  ListKnowledgeBaseRequest: () => ListKnowledgeBaseRequest,
  ListMemoriesRequest: () => ListMemoriesRequest,
  ListMemoryDreamActionsRequest: () => ListMemoryDreamActionsRequest,
  ListMemoryDreamTasksRequest: () => ListMemoryDreamTasksRequest,
  ListMemoryStoreMessagesRequest: () => ListMemoryStoreMessagesRequest,
  ListMemoryStoreRequestsRequest: () => ListMemoryStoreRequestsRequest,
  ListMemoryStoreScopesRequest: () => ListMemoryStoreScopesRequest,
  ListMemoryStoresRequest: () => ListMemoryStoresRequest,
  ListMemoryTasksRequest: () => ListMemoryTasksRequest,
  MessagePayload: () => MessagePayload,
  MetadataField: () => MetadataField,
  MetadataFieldType: () => MetadataFieldType,
  MetadataFilter: () => MetadataFilter,
  MetadataFilterBuilder: () => MetadataFilterBuilder,
  ModelConfiguration: () => ModelConfiguration,
  OTSClientError: () => OTSClientError,
  OTSServiceError: () => OTSServiceError,
  RRFConfiguration: () => RRFConfiguration,
  RequestContext: () => RequestContext,
  RerankingConfiguration: () => RerankingConfiguration,
  RerankingType: () => RerankingType,
  RetrievalConfiguration: () => RetrievalConfiguration,
  RetrievalQuery: () => RetrievalQuery,
  RetrievalQueryType: () => RetrievalQueryType,
  RetrieveRequest: () => RetrieveRequest,
  Scope: () => Scope,
  SearchMemoriesRequest: () => SearchMemoriesRequest,
  SearchType: () => SearchType,
  SignV2: () => SignV2,
  SignV4: () => SignV4,
  UNSET: () => UNSET,
  UpdateChunkItem: () => UpdateChunkItem,
  UpdateChunksRequest: () => UpdateChunksRequest,
  UpdateDocumentRequest: () => UpdateDocumentRequest,
  UpdateKnowledgeBaseRequest: () => UpdateKnowledgeBaseRequest,
  UpdateMemoryRequest: () => UpdateMemoryRequest,
  UpdateMemoryStoreRequest: () => UpdateMemoryStoreRequest,
  UploadDocumentItem: () => UploadDocumentItem,
  UploadDocumentsRequest: () => UploadDocumentsRequest,
  WeightConfiguration: () => WeightConfiguration,
  toJSONRequest: () => toJSONRequest
});
var init_src = __esm({
  "node_modules/@tablestore/agent-storage/dist/src/index.js"() {
    init_client_error();
    init_service_error();
    init_request_context();
    init_sign_v2();
    init_sign_v4();
    init_unset();
    init_enums();
    init_metadata_filter();
    init_knowledge_base();
    init_document();
    init_chunk();
    init_retrieve();
    init_memory();
    init_to_json_request();
    init_agent_storage_client();
  }
});

// bin/cli.mjs
import { parseArgs } from "node:util";

// src/core/config.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
var bool = (v, d) => v == null ? d : ["1", "true", "yes", "on"].includes(String(v).toLowerCase());
var num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
var str = (v) => {
  const s = v == null ? "" : String(v).trim();
  return s || void 0;
};
function loadFileConfig(home = os.homedir()) {
  try {
    const p = path.join(home, ".tablestore-memory", "config.json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return {};
  }
}
function resolveConfig(env = process.env, file = {}) {
  const pick = (envKey, fileKey) => str(env[envKey]) ?? str(file[fileKey]);
  const endpoint = pick("TABLESTORE_MEMORY_ENDPOINT", "endpoint");
  const instanceName = pick("TABLESTORE_MEMORY_INSTANCE", "instance");
  const apiKey = pick("TABLESTORE_MEMORY_API_KEY", "apiKey");
  const accessKeyId = pick("TABLESTORE_ACCESS_KEY_ID", "accessKeyId");
  const accessKeySecret = pick("TABLESTORE_ACCESS_KEY_SECRET", "accessKeySecret");
  if (!endpoint) return { ok: false, error: "missing endpoint (TABLESTORE_MEMORY_ENDPOINT)" };
  if (!instanceName) return { ok: false, error: "missing instance (TABLESTORE_MEMORY_INSTANCE)" };
  let auth;
  if (apiKey) {
    if (!/^https:\/\//i.test(endpoint)) return { ok: false, error: "apiKey mode requires an https endpoint" };
    auth = { apiKey };
  } else if (accessKeyId && accessKeySecret) {
    auth = { accessKeyId, accessKeySecret };
  } else {
    return { ok: false, error: "missing auth: set TABLESTORE_MEMORY_API_KEY or TABLESTORE_ACCESS_KEY_ID+SECRET" };
  }
  const config = {
    endpoint,
    instanceName,
    auth,
    storeName: pick("TABLESTORE_MEMORY_STORE_NAME", "storeName") ?? "claude_code_mem",
    storeDescription: pick("TABLESTORE_MEMORY_STORE_DESCRIPTION", "storeDescription") ?? "Claude Code long-term memory",
    appId: pick("TABLESTORE_MEMORY_APP_ID", "appId") ?? "claude-code",
    tenantId: pick("TABLESTORE_MEMORY_TENANT_ID", "tenantId"),
    agentId: pick("TABLESTORE_MEMORY_AGENT_ID", "agentId") ?? "claude-code",
    searchTopK: Math.max(1, Math.min(50, num(env.TABLESTORE_MEMORY_SEARCH_TOP_K ?? file.searchTopK, 5))),
    enableRerank: bool(env.TABLESTORE_MEMORY_ENABLE_RERANK ?? file.enableRerank, true),
    writebackEnabled: bool(env.TABLESTORE_MEMORY_WRITEBACK_ENABLED ?? file.writebackEnabled, true),
    includeScores: bool(env.TABLESTORE_MEMORY_INCLUDE_SCORES ?? file.includeScores, true),
    minQueryLength: Math.max(0, num(env.TABLESTORE_MEMORY_MIN_QUERY_LENGTH ?? file.minQueryLength, 6)),
    autoCreateStore: bool(env.TABLESTORE_MEMORY_AUTO_CREATE_STORE ?? file.autoCreateStore, true),
    dream: {
      enabled: bool(env.TABLESTORE_MEMORY_DREAM_ENABLED ?? file.dreamEnabled, true),
      applyMode: (pick("TABLESTORE_MEMORY_DREAM_APPLY_MODE", "dreamApplyMode") ?? "safe_auto") === "proposal" ? "proposal" : "safe_auto",
      confidence: Math.max(0, Math.min(1, num(env.TABLESTORE_MEMORY_DREAM_CONFIDENCE ?? file.dreamConfidence, 0.9))),
      maxScopes: Math.max(1, Math.min(20, num(env.TABLESTORE_MEMORY_DREAM_MAX_SCOPES ?? file.dreamMaxScopes, 20))),
      minIntervalHours: Math.max(0, num(env.TABLESTORE_MEMORY_DREAM_MIN_INTERVAL_HOURS ?? file.dreamMinIntervalHours, 24))
    }
  };
  return { ok: true, config };
}

// src/core/log.mjs
function makeLogger(prefix = "tablestore-memory") {
  const emit = (msg) => process.stderr.write(`${prefix}: ${msg}
`);
  return {
    debug: (m) => {
      if (process.env.TABLESTORE_MEMORY_DEBUG) emit(m);
    },
    warn: (m) => emit(m),
    error: (m) => emit(m)
  };
}

// src/core/client.mjs
function resolveCtor(mod) {
  return mod?.AgentStorageClient ?? mod?.default?.AgentStorageClient ?? (typeof mod?.default === "function" ? mod.default : null);
}
function authOptions(config) {
  return config.auth.apiKey ? { apiKey: config.auth.apiKey } : { accessKeyId: config.auth.accessKeyId, accessKeySecret: config.auth.accessKeySecret };
}
async function createClient(config, { importModule } = {}) {
  const mod = importModule ? await importModule() : await Promise.resolve().then(() => (init_src(), src_exports));
  const Ctor = resolveCtor(mod);
  if (!Ctor) throw new Error("AgentStorageClient constructor not found in @tablestore/agent-storage");
  return new Ctor({
    endpoint: config.endpoint,
    instanceName: config.instanceName,
    ...authOptions(config)
  });
}

// src/core/scope.mjs
import os2 from "node:os";
var DEFAULT = "__default__";
var clean = (v, fb = DEFAULT) => {
  const s = v == null ? "" : String(v).trim();
  return s || fb;
};
function safeUser() {
  try {
    return os2.userInfo().username;
  } catch {
    return "";
  }
}
function tenant(cfg, { uid, osUser } = {}) {
  if (uid) return clean(uid);
  if (cfg.tenantId) return clean(cfg.tenantId);
  const u = osUser != null ? osUser : safeUser();
  return clean(u);
}
function writeScope(cfg, { sessionId, uid, osUser } = {}) {
  return {
    appId: clean(cfg.appId, "claude-code"),
    tenantId: tenant(cfg, { uid, osUser }),
    agentId: clean(cfg.agentId, "claude-code"),
    runId: clean(sessionId)
  };
}
function readScope(cfg, { uid, osUser } = {}) {
  return {
    appId: clean(cfg.appId, "claude-code"),
    tenantId: tenant(cfg, { uid, osUser }),
    agentId: "*",
    runId: "*"
  };
}

// src/core/store.mjs
var globalEnsured = /* @__PURE__ */ new Set();
function isNotFound(e) {
  const s = `${e?.code || ""} ${e?.message || ""}`.toLowerCase();
  return s.includes("notexist") || s.includes("not found") || s.includes("not exist");
}
function isConflict(e) {
  const s = `${e?.code || ""} ${e?.message || ""}`.toLowerCase();
  return s.includes("already") || s.includes("conflict") || s.includes("exist");
}
async function ensureMemoryStore(client, config, { ensured = globalEnsured } = {}) {
  const name = config.storeName;
  if (ensured.has(name)) return;
  try {
    await client.getMemoryStore({ memoryStoreName: name });
    ensured.add(name);
    return;
  } catch (e) {
    if (!isNotFound(e)) throw e;
  }
  if (!config.autoCreateStore) throw new Error(`memory store "${name}" not found and autoCreateStore is disabled`);
  try {
    await client.createMemoryStore({ memoryStoreName: name, description: config.storeDescription });
  } catch (e) {
    if (!isConflict(e)) throw e;
  }
  ensured.add(name);
}

// src/core/search.mjs
async function searchMemories(client, config, { query, scope, topK }) {
  const res = await client.searchMemories({
    memoryStoreName: config.storeName,
    scope,
    query,
    topK: topK ?? config.searchTopK,
    enableRerank: config.enableRerank
  });
  return { results: Array.isArray(res?.results) ? res.results : [], scope };
}
function unitText(item) {
  return item?.unit?.text ?? item?.unit?.content ?? item?.text ?? "";
}
function formatResults(results, { includeScores = true } = {}) {
  if (!Array.isArray(results) || results.length === 0) return "";
  const lines = results.map((it, i) => {
    const t = String(unitText(it)).trim();
    const s = includeScores && typeof it?.score === "number" ? ` (score: ${it.score.toFixed(2)})` : "";
    return `${i + 1}. ${t}${s}`;
  });
  return `Relevant long-term memories (from Tablestore memory):
${lines.join("\n")}`;
}

// src/core/add.mjs
var bytes = (s) => Buffer.byteLength(String(s ?? ""), "utf8");
function chunkMessages(messages, maxCount = 20, maxBytes = 32e3) {
  const batches = [];
  let cur = [];
  let curBytes = 0;
  for (const m of messages) {
    const b = bytes(m.content);
    if (cur.length > 0 && (cur.length >= maxCount || curBytes + b > maxBytes)) {
      batches.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(m);
    curBytes += b;
  }
  if (cur.length) batches.push(cur);
  return batches;
}
async function addMemories(client, config, { messages, text, scope, sync = false }) {
  if (text != null) {
    await client.addMemories({ memoryStoreName: config.storeName, scope, text, sync });
    return;
  }
  const batches = chunkMessages(messages ?? []);
  for (const batch of batches) {
    await client.addMemories({ memoryStoreName: config.storeName, scope, messages: batch, sync });
  }
}

// src/core/dream.mjs
var TERMINAL = /* @__PURE__ */ new Set(["completed", "completed_with_failures", "failed", "cancelled"]);
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function runDream(client, config, {
  scopes,
  applyMode,
  wait = false,
  pollIntervalMs = 3e3,
  pollTimeoutMs = 6e4
}) {
  const mode = applyMode ?? config.dream.applyMode;
  const conf = config.dream.confidence;
  const created = await client.createMemoryDreamTask({
    memoryStoreName: config.storeName,
    scopes,
    taskType: "memory",
    applyMode: mode,
    incremental: true,
    ...mode === "safe_auto" ? { confidenceThresholds: { add: conf, update: conf, merge: conf } } : {}
  });
  const dreamId = created?.dreamId;
  if (!wait || !dreamId) return created;
  const deadline = Date.now() + pollTimeoutMs;
  let last = created;
  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);
    try {
      last = await client.getMemoryDreamTask({ memoryStoreName: config.storeName, dreamId });
      if (TERMINAL.has(last?.status)) break;
    } catch {
    }
  }
  return last;
}

// bin/cli.mjs
var RUN_ID = () => `cli-${process.pid}-${Math.floor(Date.now() / 1e3)}`;
async function cmdSearch(args, { client, config }) {
  await ensureMemoryStore(client, config);
  const scope = readScope(config, { uid: args.uid });
  const topK = args["top-k"] != null ? Number(args["top-k"]) : config.searchTopK;
  const cfg = { ...config, enableRerank: args["no-rerank"] ? false : config.enableRerank };
  const { results } = await searchMemories(client, cfg, { query: args._[0] ?? "", scope, topK });
  return { results, text: formatResults(results, { includeScores: config.includeScores }) };
}
async function cmdAdd(args, { client, config }) {
  await ensureMemoryStore(client, config);
  const scope = writeScope(config, { sessionId: RUN_ID(), uid: args.uid });
  await addMemories(client, config, { text: args._[0] ?? "", scope, sync: !!args.sync });
  return { ok: true, scope };
}
async function cmdDoctor(args, { client, config }) {
  const result = { ok: false, endpoint: config.endpoint, instanceName: config.instanceName, store: null, sample: [] };
  await ensureMemoryStore(client, config);
  result.store = await client.getMemoryStore({ memoryStoreName: config.storeName });
  const scope = readScope(config, { uid: args.uid });
  const list = await client.listMemories({ memoryStoreName: config.storeName, scope, limit: 3 });
  result.sample = list?.memories ?? list?.results ?? [];
  result.ok = true;
  return result;
}
async function cmdDream(args, { client, config }) {
  await ensureMemoryStore(client, config);
  const tenantScope = readScope(config, { uid: args.uid });
  return runDream(client, config, {
    scopes: [tenantScope],
    applyMode: args["apply-mode"],
    wait: !!args.wait
  });
}
var COMMANDS = { search: cmdSearch, add: cmdAdd, doctor: cmdDoctor, dream: cmdDream };
async function main(argv = process.argv.slice(2)) {
  const logger = makeLogger("tablestore-memory-cli");
  const [cmd, ...rest] = argv;
  if (!cmd || !COMMANDS[cmd]) {
    process.stderr.write("usage: tablestore-memory <search|add|doctor|dream> [args]\n");
    process.exit(cmd ? 1 : 0);
  }
  const { values, positionals } = parseArgs({
    args: rest,
    allowPositionals: true,
    options: {
      uid: { type: "string" },
      "top-k": { type: "string" },
      "no-rerank": { type: "boolean" },
      sync: { type: "boolean" },
      "apply-mode": { type: "string" },
      wait: { type: "boolean" },
      quiet: { type: "boolean", short: "q" }
    }
  });
  const { ok, config, error } = resolveConfig(process.env, loadFileConfig());
  if (!ok) {
    process.stderr.write(`config error: ${error}
`);
    process.exit(2);
  }
  try {
    const client = await createClient(config);
    const out = await COMMANDS[cmd]({ ...values, _: positionals }, { client, config });
    process.stdout.write(JSON.stringify(values.quiet ? out.results ?? out : out, null, 2) + "\n");
  } catch (e) {
    logger.error(`${cmd} failed: ${e?.message || e}`);
    process.exit(1);
  }
}
if (import.meta.url === `file://${process.argv[1]}`) main();
export {
  cmdAdd,
  cmdDoctor,
  cmdDream,
  cmdSearch,
  main
};
