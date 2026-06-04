USE QuanLyQuanCaPhe;

INSERT INTO roles (RoleName)
VALUES
  ('Admin'),
  ('Nhân viên'),
  ('Pha chế')
ON DUPLICATE KEY UPDATE RoleName = VALUES(RoleName);
