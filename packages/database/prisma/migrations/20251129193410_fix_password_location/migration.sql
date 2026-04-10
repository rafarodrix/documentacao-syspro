DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'account'
      AND column_name = 'password'
  ) THEN
    ALTER TABLE "account" DROP COLUMN "password";
  END IF;
END $$;
