-- 1. Drop the existing function first to change its return type
drop function if exists match_school_documents(vector,float,int);

-- 2. Re-create the function with the correct types
create or replace function match_school_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    school.id,
    school.content,
    school.metadata,
    1 - (school.embedding <=> query_embedding) as similarity
  from school
  where 1 - (school.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;
