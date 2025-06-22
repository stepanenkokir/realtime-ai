import { promises as fs } from "fs";
import path from "path";

export const saveUserToDatabase = async (user) => {
  const usersDir = path.join(process.cwd(), "users");
  const userDir = path.join(usersDir, user.id.toString());
  const userFile = path.join(userDir, "user.json");

  const now = new Date().toISOString();

  await fs.mkdir(userDir, { recursive: true });

  let dataToSave;

  try {
    const existingData = JSON.parse(await fs.readFile(userFile, "utf-8"));
    dataToSave = {
      ...existingData,
      ...user,
      updated_time: now,
    };
  } catch (err) {
    // Файл не существует или ошибка чтения — создаём новый
    dataToSave = {
      ...user,
      created_time: now,
      updated_time: now,
    };
  }

  await fs.writeFile(userFile, JSON.stringify(dataToSave, null, 2), "utf-8");
};

export const saveCurrentDialog = async (dialog, userId, name) => {
  if (!Array.isArray(dialog) || dialog.length === 0) {
    throw new Error("Dialog must be a non-empty array");
  }

  const baseDir = path.join(
    process.cwd(),
    "users",
    userId.toString(),
    "transcripts"
  );
  await fs.mkdir(baseDir, { recursive: true });

  const now = new Date();
  //  const timestamp = now.toISOString().replace(/[:.]/g, "-"); // Для имени файла
  const fileName = `${name}.json`;
  const filePath = path.join(baseDir, fileName);

  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        created_time: now.toISOString(),
        dialog,
      },
      null,
      2
    ),
    "utf-8"
  );
};
