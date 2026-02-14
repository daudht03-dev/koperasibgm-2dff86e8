
CREATE OR REPLACE FUNCTION public.generate_batch_number()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_year TEXT;
    v_month TEXT;
    v_sequence INTEGER;
    v_batch_number TEXT;
BEGIN
    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
    v_month := TO_CHAR(CURRENT_DATE, 'MM');
    
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(batch_number FROM 14 FOR 4) AS INTEGER)
    ), 0) + 1
    INTO v_sequence
    FROM public.batch_panen
    WHERE batch_number LIKE 'BATCH-' || v_year || v_month || '-%';
    
    v_batch_number := 'BATCH-' || v_year || v_month || '-' || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_batch_number;
END;
$function$;
