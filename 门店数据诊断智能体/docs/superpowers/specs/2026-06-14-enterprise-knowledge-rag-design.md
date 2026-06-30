# Enterprise Knowledge RAG Design

Date: 2026-06-14
Status: Draft for review
Scope: Upgrade the existing Knowledge page from document storage into a governed enterprise operating knowledge base for the existing Next.js + FastAPI system

## 1. Summary

The current system already has:

1. A `Knowledge` page
2. Support for uploading SOP documents
3. Support for uploading business rules

The current limitation is that these files behave as stored materials only. They are not yet structured, published, retrieved, cited, or consumed automatically by the Agent during store diagnosis.

This design upgrades the system into an enterprise operating knowledge base that supports:

1. SOP knowledge
2. Training materials
3. Store inspection records
4. Historical diagnosis cases
5. Brand operating rules
6. Headquarters management policies
7. Store best-practice cases

The product outcome is:

1. The Agent can automatically retrieve relevant knowledge during diagnosis
2. The Agent can cite the exact source used for each recommendation
3. Users can see document title, page number, and excerpt instead of receiving ungrounded AI output

Example target behavior:

1. The Agent detects rising complaint rate
   - cites `《门店客诉处理规范》`
2. The Agent detects revenue decline
   - cites `《经营改善行动手册》`

## 2. Product Goal

Turn the existing document upload page into a governed knowledge system that improves Agent trustworthiness without rewriting the current diagnosis and conversation interaction model.

The upgraded knowledge system must:

1. Preserve the existing conversation-first product direction
2. Add knowledge retrieval as an enhancement layer rather than a workflow rewrite
3. Require structured citations for advice that relies on rules, SOPs, or operating standards
4. Allow users to verify where a recommendation came from

## 3. Confirmed Product Decisions

The following product decisions were confirmed during design:

1. Delivery scope: first shippable phase only
   - Knowledge retrieval, citations, and Agent auto-use must be real in V1
   - Knowledge graph is V2 extension only
2. Knowledge scope: one shared cross-brand enterprise knowledge base in V1
3. Ingestion mode: manual upload only in V1
4. Governance rule: upload does not equal activation
   - knowledge must be manually published before retrieval
5. Citation display granularity:
   - document title
   - page number
   - source excerpt
6. Integration strategy:
   - do not replace current Agent interaction logic
   - add a retrieval and citation enhancement layer

## 4. Non-goals

This phase does not include:

1. Automatic sync from drive, wiki, or external doc systems
2. Cross-brand isolation rules
3. Full knowledge graph retrieval in production
4. Replacing the current conversation orchestration model
5. Turning the Knowledge page into a complex admin console unrelated to user value

## 5. Current System Constraints

The design must fit the existing repository and product direction:

1. Next.js frontend workspace: `store-ai-clinic-web/`
2. FastAPI backend workspace: `src/store_ai_clinic/`
3. Existing conversation entrypoint:
   - `POST /api/conversations/sessions/{session_id}/messages`
4. Existing conversation orchestration:
   - `services/orchestrator.py`
5. Existing frontend Knowledge page:
   - currently store-backed mock state and upload placeholders
6. Existing product requirement:
   - avoid arbitrary changes to current Agent handling logic

The design must therefore:

1. Preserve current message posting and answer rendering
2. Add knowledge retrieval before response generation
3. Extend responses with structured citations

## 6. Recommended Architecture

### 6.1 Architectural choice

Recommended approach: add a governed Knowledge Retrieval Service around the current Agent orchestration flow.

Why this is recommended:

1. It preserves the current Agent entrypoints
2. It keeps retrieval logic independent from conversation orchestration
3. It allows indexing, reranking, and citation behavior to evolve without destabilizing the existing Agent workflow
4. It supports a clean future path toward knowledge graph expansion

### 6.2 Major layers

1. Knowledge source management
2. Knowledge ingestion pipeline
3. Knowledge publication service
4. Knowledge retrieval service
5. Conversation orchestration enhancement
6. Citation presentation layer

### 6.3 Responsibility split

Knowledge source management:

1. Upload files
2. Manage metadata
3. Track lifecycle state

Knowledge ingestion pipeline:

1. Parse files
2. Chunk content
3. Extract structure and metadata
4. Generate embeddings
5. Persist indexable units

Knowledge publication service:

1. Decide which indexed knowledge becomes active
2. Maintain version validity
3. Preserve previously published versions when a new version is not yet published

Knowledge retrieval service:

1. Accept a diagnosis query
2. Apply metadata filters
3. Run hybrid recall
4. Rerank evidence
5. Produce citation-ready evidence payloads

Conversation orchestration enhancement:

1. Call the retrieval service before answering
2. Inject evidence into the generation context
3. Return `assistant_message` plus structured `citations`

### 6.4 Integration boundary

The current conversation flow stays intact:

1. user posts a message
2. existing conversation endpoint receives it
3. orchestrator handles the turn

The new enhancement path is:

1. orchestrator classifies the user problem
2. orchestrator calls `knowledge_retrieval_service.retrieve(...)`
3. orchestrator gets top evidence and citations
4. response generation uses that evidence
5. response returns:
   - `assistant_message`
   - `followup_suggestions`
   - `citations`

## 7. Knowledge Lifecycle

The first phase should use explicit governance states.

### 7.1 Required states

1. `draft`
2. `processing`
3. `pending_publish`
4. `published`
5. `archived`

### 7.2 Retrieval rule

Only `published` knowledge may be retrieved by the Agent.

### 7.3 Version rule

If a new version is uploaded but not yet published:

1. the previous published version remains active
2. the new version stays excluded from retrieval

### 7.4 User-facing meaning

This prevents the Agent from citing:

1. incomplete uploads
2. unreviewed parsing results
3. draft materials
4. superseded but not yet archived data without explicit governance

## 8. Chunk Strategy

The system should not use one universal chunk rule. Chunking must follow document intent.

### 8.1 SOP, brand rules, and HQ policies

Recommended chunking:

1. dual structure
   - chapter-level context
   - clause-level chunks
2. chunk length target:
   - 300-600 Chinese characters
3. required metadata:
   - `page_no`
   - `chapter_title`
   - `section_title`
   - `clause_label`
   - `version_label`

Reason:

1. These documents are the highest-authority sources
2. They need stable citation paths
3. Recommendations must link to precise operational rules

### 8.2 Training materials

Recommended chunking:

1. page or topic-section chunks
2. chunk length target:
   - 200-500 Chinese characters
3. metadata:
   - `page_no`
   - `topic_title`

### 8.3 Inspection records, diagnosis cases, and best practices

Recommended chunking:

1. case-unit chunks rather than raw page chunks
2. each chunk should preserve:
   - issue
   - root cause
   - action
   - result
3. metadata:
   - `issue_type`
   - `root_cause_tag`
   - `action_tag`
   - `store_type_tag`
   - `region_tag`

### 8.4 Tables and spreadsheets

Recommended approach:

1. structured extraction first
2. chunk on semantic rows or sections
3. do not embed an entire sheet as one flat raw text block

### 8.5 Citation-preserving fields

Every chunk should store:

1. `chunk_text`
2. `summary_text`
3. `quote_text`

Purpose:

1. `chunk_text` for retrieval
2. `summary_text` for abstract matching
3. `quote_text` for user-visible citation excerpts

## 9. Embedding Strategy

### 9.1 Recommended V1 strategy

Use a dual-embedding approach:

1. content embedding
   - generated from `chunk_text`
2. summary embedding
   - generated from `summary_text`

### 9.2 Why dual embedding is recommended

Store diagnosis questions are often abstract:

1. `客诉率上升`
2. `营业额下降`
3. `整改动作是否合规`

These may not match the literal wording in rule documents. Summary embeddings help bridge from operating-language problems to standardized document language.

### 9.3 Metadata constraints for retrieval

Even with a shared cross-brand knowledge base, the system should filter or rank using:

1. `knowledge_type`
2. `status`
3. `effective_from`
4. `effective_to`
5. `version_label`

### 9.4 Query normalization

Before retrieval, the system should derive:

1. raw user question
2. normalized problem statement
3. intent label

Example:

- raw: `客诉率上升，怎么办`
- normalized: `客诉处理规范、服务恢复SOP、升级闭环要求`

## 10. Retrieval Strategy

### 10.1 Recommended approach

Use hybrid retrieval in V1:

1. metadata filter
2. BM25 full-text recall
3. vector recall
4. merge candidates
5. rerank final candidates

### 10.2 Retrieval steps

1. classify intent
2. normalize the query
3. choose metadata filters
4. run BM25 recall
5. run vector recall
6. union results
7. rerank
8. return top evidence

### 10.3 Metadata filters

Required V1 filters:

1. `status = published`
2. valid effective window

Preferred ranking biases:

1. `brand_rule`
2. `hq_policy`
3. `sop`
4. `training`
5. `inspection`
6. `diagnosis_case`
7. `best_practice`

### 10.4 Retrieval output size

Recommended evidence return:

1. top 5-8 chunks to the LLM
2. top 1-3 citations shown by default in UI

## 11. Rerank Strategy

V1 reranking should not rely on similarity score alone.

### 11.1 Rerank dimensions

1. semantic relevance to the current operating problem
2. authority of the knowledge type
3. recency and validity of the document version
4. actionability of the evidence
5. citation quality
   - does it have clean page metadata and excerpt text

### 11.2 Authority ordering

Recommended V1 authority priority:

1. brand operating rules
2. headquarters management policies
3. SOP knowledge
4. training materials
5. inspection records
6. historical diagnosis cases
7. best-practice cases

### 11.3 Why this matters

If a rule document and a case document both mention the same issue, the rule document should usually be cited first for normative guidance. Cases should reinforce the recommendation, not replace policy authority.

## 12. Citation Mechanism

This is the most important V1 trust feature.

### 12.1 Every citation should contain

1. `source_id`
2. `source_title`
3. `knowledge_type`
4. `page_no`
5. `chapter_title`
6. `chunk_id`
7. `quote_text`
8. `version_label`

### 12.2 UI display requirement

Users should see:

1. document title
2. page number
3. excerpt text

Example:

- `《运营手册V3》`
- `第24页`
- `“门店在收到客诉后，应在30分钟内完成首次响应。”`

### 12.3 Response rule

If a recommendation is generated without retrieved evidence:

1. the system may still answer
2. but the answer must explicitly signal that the recommendation lacks knowledge-base grounding

Example:

- `本条建议暂无知识库依据，请人工确认`

### 12.4 Assistant output rule

Recommendations based on policy, SOP, or operational standards should not appear as unsupported statements when relevant evidence is available.

## 13. Knowledge Graph Expansion Plan

Knowledge graph is explicitly V2, but V1 should preserve a migration path.

### 13.1 Suggested node types

1. `Document`
2. `Chunk`
3. `IssueType`
4. `Metric`
5. `Action`
6. `Role`
7. `StoreType`

### 13.2 Suggested relationships

1. `Chunk -> addresses -> IssueType`
2. `Chunk -> recommends -> Action`
3. `Chunk -> applies_to -> StoreType`
4. `Case -> validates -> Action`
5. `Policy -> constrains -> Action`

### 13.3 Why V1 should prepare for it

The chunk metadata and tag system should be designed so the team can later promote structured tags into graph nodes and edges without redoing the full ingestion model.

## 14. PostgreSQL Table Design

### 14.1 Recommended database choice

Use PostgreSQL plus `pgvector` in V1.

Reason:

1. minimal infrastructure expansion
2. clean fit with the current backend stack
3. easier governance and joins across source, chunk, publish, and retrieval logs

### 14.2 Core tables

#### `knowledge_source`

Purpose:

1. one row per uploaded knowledge source
2. source lifecycle and governance state

Suggested fields:

- `source_id` PK
- `source_title`
- `knowledge_type`
- `status`
- `version_label`
- `file_name`
- `file_path`
- `mime_type`
- `page_count`
- `effective_from`
- `effective_to`
- `created_by`
- `created_at`
- `updated_at`
- `published_at`
- `archived_at`

#### `knowledge_source_revision`

Purpose:

1. support version replacement without breaking active retrieval

Suggested fields:

- `revision_id` PK
- `source_id` FK
- `version_label`
- `status`
- `checksum`
- `is_current`
- `created_at`
- `published_at`

#### `knowledge_chunk`

Purpose:

1. one row per indexable citation-preserving chunk

Suggested fields:

- `chunk_id` PK
- `source_id` FK
- `revision_id` FK
- `chunk_no`
- `page_no`
- `chapter_title`
- `section_title`
- `clause_label`
- `chunk_text`
- `summary_text`
- `quote_text`
- `token_count`
- `metadata_json`
- `created_at`

#### `knowledge_chunk_embedding`

Purpose:

1. decouple chunks from embedding variants

Suggested fields:

- `embedding_id` PK
- `chunk_id` FK
- `embedding_type`
- `model_name`
- `embedding` vector
- `created_at`

#### `knowledge_tag_link`

Purpose:

1. structured tags for retrieval and future graph expansion

Suggested fields:

- `tag_link_id` PK
- `chunk_id` FK
- `tag_type`
- `tag_value`

#### `knowledge_publish_audit`

Purpose:

1. audit trail for publishing and rejection actions

Suggested fields:

- `audit_id` PK
- `source_id` FK
- `revision_id` FK
- `action`
- `operator_id`
- `comment`
- `created_at`

#### `knowledge_retrieval_log`

Purpose:

1. record every Agent retrieval request for quality analysis

Suggested fields:

- `retrieval_id` PK
- `session_id`
- `message_id`
- `query_text`
- `normalized_query`
- `intent_label`
- `filter_json`
- `selected_chunk_ids`
- `created_at`

### 14.3 Minimal V1 required tables

At minimum, V1 should implement:

1. `knowledge_source`
2. `knowledge_chunk`
3. `knowledge_chunk_embedding`
4. `knowledge_publish_audit`
5. `knowledge_retrieval_log`

### 14.4 Critical fields that must exist

1. `status`
2. `page_no`
3. `quote_text`

Without these, the published governance and visible citation goals fail.

## 15. Vector Store Design

### 15.1 Recommended V1 storage choice

Store vectors in PostgreSQL using `pgvector`.

### 15.2 Why not an external vector DB in V1

An external vector database would add operational complexity before the team has validated:

1. citation usefulness
2. retrieval quality
3. publication governance
4. Agent integration behavior

### 15.3 Suggested indexing

Use vector indexing for:

1. content embedding
2. summary embedding

Use relational or GIN indexing for:

1. `status`
2. `knowledge_type`
3. `page_no`
4. tags

## 16. RAG Pipeline

### 16.1 Ingestion pipeline

1. upload source
2. store draft metadata
3. parse file
4. chunk by knowledge type
5. generate summaries
6. generate embeddings
7. store chunks and embeddings
8. mark source `pending_publish`
9. publish manually
10. mark source `published`

### 16.2 Query pipeline

1. user asks Agent a question
2. orchestrator extracts or infers problem context
3. retrieval service normalizes query and filters metadata
4. hybrid recall runs
5. rerank runs
6. evidence is packed into a generation context
7. LLM generates answer plus citation references
8. frontend renders answer and evidence

## 17. Agent Call Flow

### 17.1 Recommended V1 turn sequence

1. user sends message
2. current conversation endpoint receives it
3. orchestrator classifies whether knowledge grounding is needed
4. orchestrator calls `knowledge_retrieval_service.retrieve(...)`
5. top evidence returns
6. evidence and conversation context are sent into answer generation
7. system persists:
   - assistant text
   - retrieval log
   - citations
8. frontend renders answer with source evidence

### 17.2 Important compatibility rule

Do not remove or replace the current primary assistant text path.

Instead:

1. keep `assistant_message`
2. add `citations`
3. add optional evidence summary metadata

## 18. API Design

### 18.1 Knowledge management endpoints

Recommended FastAPI additions:

1. `POST /api/knowledge/sources`
2. `GET /api/knowledge/sources`
3. `GET /api/knowledge/sources/{source_id}`
4. `PATCH /api/knowledge/sources/{source_id}`
5. `POST /api/knowledge/sources/{source_id}/upload`
6. `POST /api/knowledge/sources/{source_id}/publish`
7. `POST /api/knowledge/sources/{source_id}/reject`
8. `POST /api/knowledge/sources/{source_id}/archive`

### 18.2 Retrieval endpoints

Recommended additions:

1. `POST /api/knowledge/retrieve`
2. `GET /api/knowledge/chunks/{chunk_id}`
3. `GET /api/knowledge/retrieval-logs/{retrieval_id}`

### 18.3 Conversation endpoint evolution

Keep the current endpoint:

- `POST /api/conversations/sessions/{session_id}/messages`

Extend the response payload to include:

1. `assistant_message`
2. `followup_suggestions`
3. `citations`
4. `evidence_summary`

Example response:

```json
{
  "assistant_message": "客诉率上升主要与门店未按标准完成首响闭环有关。",
  "followup_suggestions": [],
  "citations": [
    {
      "source_id": "src_001",
      "source_title": "门店客诉处理规范",
      "knowledge_type": "sop",
      "page_no": 24,
      "chapter_title": "客诉升级处理",
      "quote_text": "门店在收到客诉后，应在30分钟内完成首次响应。",
      "version_label": "V3"
    }
  ],
  "evidence_summary": "已引用 1 条 SOP 依据"
}
```

## 19. Frontend Design

### 19.1 Knowledge page direction

Upgrade the current page from placeholder storage UI into a governed knowledge workspace.

Recommended V1 views:

1. `总览`
2. `知识源`
3. `待发布`
4. `已发布`

### 19.2 Knowledge source list fields

Each source row should show:

1. title
2. knowledge type
3. version
4. status
5. effective period
6. last update time

### 19.3 Pending publish view

This view is strongly recommended for V1.

Why:

1. upload and publish are separate business actions
2. operations staff need an obvious queue for governance
3. it prevents draft materials from being confused with active knowledge

### 19.4 Agent answer presentation

Keep the current message layout, but add an evidence block below the answer when citations exist.

The evidence block should display:

1. document title
2. page number
3. quote excerpt

If no citation exists:

1. show a quiet but explicit warning
2. do not fabricate a source section

## 20. Error Handling

### 20.1 Retrieval failure

If knowledge retrieval fails:

1. do not break the conversation flow
2. allow the Agent to continue with fallback behavior
3. explicitly avoid pretending that citations were used

### 20.2 No-match behavior

If retrieval returns no sufficient evidence:

1. the Agent may still provide a general analytical response
2. the UI must indicate that the recommendation lacks knowledge grounding

### 20.3 Publish-state protection

If a source is not published:

1. it must not enter retrieval results
2. it must not appear in user-facing citations

## 21. Testing Strategy

### 21.1 Backend tests

Add tests for:

1. source state transitions
2. chunk creation by knowledge type
3. retrieval exclusion of non-published knowledge
4. citation payload generation
5. conversation endpoint compatibility with citations

### 21.2 Frontend tests

Add tests for:

1. Knowledge source status rendering
2. pending publish queue behavior
3. Agent answer citation rendering
4. no-citation warning state

### 21.3 Manual verification

Verify these end-to-end scenarios:

1. upload SOP -> parse -> publish -> Agent cites it
2. upload new version -> do not publish -> old version still cited
3. ask a question with no matching knowledge -> Agent warns that evidence is missing

## 22. Risks and Controls

### Risk 1: draft knowledge contaminates production answers

Control:

1. published-only retrieval rule
2. explicit publish audit log

### Risk 2: citations look precise but are weak

Control:

1. store page number
2. store excerpt text
3. rerank partly on citation quality

### Risk 3: retrieval logic spreads into orchestration logic

Control:

1. keep Retrieval Service separate
2. keep orchestrator as a consumer, not the owner, of retrieval algorithms

### Risk 4: Knowledge page becomes a technical console

Control:

1. keep the user-facing views focused on readiness, publishability, and trusted usage
2. avoid exposing low-value indexing internals in the primary surface

## 23. Final Recommendation

Proceed with a first-phase governed enterprise knowledge system built as an enhancement layer around the existing Agent workflow.

The best V1 shape is:

1. shared enterprise knowledge base
2. manual upload
3. explicit publish step
4. PostgreSQL plus `pgvector`
5. independent Knowledge Retrieval Service
6. visible citations in Agent answers

This best satisfies the current repository and product constraints because it:

1. adds trust without rewriting the current interaction model
2. keeps governance explicit
3. makes recommendations auditable
4. creates a clean path toward future knowledge graph expansion
