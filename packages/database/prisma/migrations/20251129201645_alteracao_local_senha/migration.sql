DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'account'
      AND column_name = 'password'
  ) THEN
    ALTER TABLE "account" ADD COLUMN "password" TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'user'
      AND column_name = 'password'
  ) THEN
    ALTER TABLE "user" DROP COLUMN "password";
  END IF;
END $$;
