import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import multer from "multer";

export const uploadsDirectory = fileURLToPath(new URL("../uploads/", import.meta.url));
export const profileUploadsDirectory = path.join(uploadsDirectory, "profile");
const statusUploadsDirectory = path.join(uploadsDirectory, "status");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const parser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 4 * 1024 * 1024, files: 1, fields: 4, fieldSize: 2048 },
    fileFilter: (req, file, callback) => {
        if (!allowedMimeTypes.has(file.mimetype)) {
            return callback(new Error("Choose a JPG, PNG, or WebP image."));
        }
        callback(null, true);
    }
});

export const imageUpload = (fieldName) => (req, res, next) => {
    parser.single(fieldName)(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                message: error.code === "LIMIT_FILE_SIZE"
                    ? "Image must be 4 MB or smaller."
                    : error.message || "Unable to upload image."
            });
        }
        next();
    });
};

const identifyImage = (buffer) => {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { extension: ".jpg", mimeType: "image/jpeg" };
    }
    if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        return { extension: ".png", mimeType: "image/png" };
    }
    if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return { extension: ".webp", mimeType: "image/webp" };
    }
    return null;
};

export const storeUploadedImage = async (file, category = "profile") => {
    if (!file) return null;
    if (category !== "profile" && category !== "status") {
        throw new Error("Invalid image storage category.");
    }
    const detectedImage = identifyImage(file.buffer);
    if (!detectedImage || detectedImage.mimeType !== file.mimetype) {
        const error = new Error("The uploaded file is not a valid JPG, PNG, or WebP image.");
        error.statusCode = 400;
        throw error;
    }

    const categoryDirectory = category === "profile"
        ? profileUploadsDirectory
        : statusUploadsDirectory;
    await fs.mkdir(categoryDirectory, { recursive: true });
    const filename = `${randomUUID()}${detectedImage.extension}`;
    await fs.writeFile(path.join(categoryDirectory, filename), file.buffer, { flag: "wx" });
    return `/uploads/${category}/${filename}`;
};

export const getUploadedImageFilePath = (imagePath) => {
    if (typeof imagePath !== "string") return null;
    const match = imagePath.match(
        /^\/uploads\/(profile|status)\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp))$/i
    );
    if (!match) return null;
    const directory = match[1] === "profile" ? profileUploadsDirectory : statusUploadsDirectory;
    return path.join(directory, match[2]);
};

export const deleteUploadedImage = async (imagePath) => {
    const filePath = getUploadedImageFilePath(imagePath);
    if (!filePath) return;
    try {
        await fs.unlink(filePath);
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }
};
