CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE "company"
  ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

ALTER TABLE "company_contact"
  ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

ALTER TABLE "conversation"
  ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '';

UPDATE "company"
SET "searchText" = trim(
  regexp_replace(
    lower(
      unaccent(
        concat_ws(
          ' ',
          coalesce("razaoSocial", ''),
          coalesce("nomeFantasia", ''),
          regexp_replace(coalesce("cnpj", ''), '\D', '', 'g'),
          coalesce("emailContato", ''),
          regexp_replace(coalesce("telefone", ''), '\D', '', 'g'),
          regexp_replace(coalesce("whatsapp", ''), '\D', '', 'g')
        )
      )
    ),
    '\s+',
    ' ',
    'g'
  )
);

UPDATE "company_contact"
SET "searchText" = trim(
  regexp_replace(
    lower(
      unaccent(
        concat_ws(
          ' ',
          coalesce("name", ''),
          coalesce("email", ''),
          regexp_replace(coalesce("phone", ''), '\D', '', 'g'),
          regexp_replace(coalesce("whatsapp", ''), '\D', '', 'g'),
          regexp_replace(coalesce("cpf", ''), '\D', '', 'g'),
          coalesce("jobTitle", '')
        )
      )
    ),
    '\s+',
    ' ',
    'g'
  )
);

UPDATE "conversation"
SET "searchText" = trim(
  regexp_replace(
    lower(
      unaccent(
        concat_ws(
          ' ',
          coalesce("subject", ''),
          coalesce("ticketNumber", ''),
          coalesce("contactNameSnapshot", ''),
          regexp_replace(coalesce("contactPhoneSnapshot", ''), '\D', '', 'g'),
          regexp_replace(coalesce("contactWhatsappSnapshot", ''), '\D', '', 'g'),
          coalesce("externalThreadId", '')
        )
      )
    ),
    '\s+',
    ' ',
    'g'
  )
);

CREATE INDEX "company_searchText_trgm_idx"
  ON "company"
  USING GIN ("searchText" gin_trgm_ops);

CREATE INDEX "company_contact_searchText_trgm_idx"
  ON "company_contact"
  USING GIN ("searchText" gin_trgm_ops);

CREATE INDEX "conversation_searchText_trgm_idx"
  ON "conversation"
  USING GIN ("searchText" gin_trgm_ops);
