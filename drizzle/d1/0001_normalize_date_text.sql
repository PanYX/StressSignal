-- Neon DATE values exported through node-postgres were previously serialized
-- with Date#toString(). Convert those locale-suffixed values to YYYY-MM-DD.
-- Fresh databases already containing ISO dates are left unchanged.

UPDATE `observations`
SET `observation_date` =
  substr(`observation_date`, 12, 4) || '-' ||
  CASE substr(`observation_date`, 5, 3)
    WHEN 'Jan' THEN '01'
    WHEN 'Feb' THEN '02'
    WHEN 'Mar' THEN '03'
    WHEN 'Apr' THEN '04'
    WHEN 'May' THEN '05'
    WHEN 'Jun' THEN '06'
    WHEN 'Jul' THEN '07'
    WHEN 'Aug' THEN '08'
    WHEN 'Sep' THEN '09'
    WHEN 'Oct' THEN '10'
    WHEN 'Nov' THEN '11'
    WHEN 'Dec' THEN '12'
  END || '-' ||
  printf('%02d', CAST(trim(substr(`observation_date`, 9, 2)) AS INTEGER))
WHERE `observation_date` NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  AND substr(`observation_date`, 5, 3) IN (
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  )
  AND CAST(trim(substr(`observation_date`, 9, 2)) AS INTEGER) BETWEEN 1 AND 31;
--> statement-breakpoint

UPDATE `indicator_snapshots`
SET `latest_date` =
  substr(`latest_date`, 12, 4) || '-' ||
  CASE substr(`latest_date`, 5, 3)
    WHEN 'Jan' THEN '01'
    WHEN 'Feb' THEN '02'
    WHEN 'Mar' THEN '03'
    WHEN 'Apr' THEN '04'
    WHEN 'May' THEN '05'
    WHEN 'Jun' THEN '06'
    WHEN 'Jul' THEN '07'
    WHEN 'Aug' THEN '08'
    WHEN 'Sep' THEN '09'
    WHEN 'Oct' THEN '10'
    WHEN 'Nov' THEN '11'
    WHEN 'Dec' THEN '12'
  END || '-' ||
  printf('%02d', CAST(trim(substr(`latest_date`, 9, 2)) AS INTEGER))
WHERE `latest_date` IS NOT NULL
  AND `latest_date` NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  AND substr(`latest_date`, 5, 3) IN (
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  )
  AND CAST(trim(substr(`latest_date`, 9, 2)) AS INTEGER) BETWEEN 1 AND 31;
--> statement-breakpoint

UPDATE `daily_commentaries`
SET `as_of_date` =
  substr(`as_of_date`, 12, 4) || '-' ||
  CASE substr(`as_of_date`, 5, 3)
    WHEN 'Jan' THEN '01'
    WHEN 'Feb' THEN '02'
    WHEN 'Mar' THEN '03'
    WHEN 'Apr' THEN '04'
    WHEN 'May' THEN '05'
    WHEN 'Jun' THEN '06'
    WHEN 'Jul' THEN '07'
    WHEN 'Aug' THEN '08'
    WHEN 'Sep' THEN '09'
    WHEN 'Oct' THEN '10'
    WHEN 'Nov' THEN '11'
    WHEN 'Dec' THEN '12'
  END || '-' ||
  printf('%02d', CAST(trim(substr(`as_of_date`, 9, 2)) AS INTEGER))
WHERE `as_of_date` NOT GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  AND substr(`as_of_date`, 5, 3) IN (
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  )
  AND CAST(trim(substr(`as_of_date`, 9, 2)) AS INTEGER) BETWEEN 1 AND 31;
