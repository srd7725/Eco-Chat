import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import multer from "multer";

export const uploadsDirectory = fileURLToPath(new URL("../uploads/", import.meta.url));
export const profileUploadsDirectory = path.join(uploadsDirectory, "profile");
const statusUploadsDirectory = path.join(uploadsDirectory, "status");
export const messageUploadsDirectory = path.join(uploadsDirectory, "message");

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const allowedDocumentMimeTypes = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "application/rtf"
]);
const allowedAttachmentMimeTypes = new Set([...allowedMimeTypes, ...allowedDocumentMimeTypes]);
const dangerousExtensions = new Set([".exe", ".bat", ".cmd", ".ps1", ".vbs", ".js", ".jar", ".scr", ".com"]);

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

const attachmentParser = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 6, fieldSize: 2048 },
    fileFilter: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        if (dangerousExtensions.has(extension)) {
            return callback(new Error("This file type is not allowed."));
        }
        if (!allowedAttachmentMimeTypes.has(file.mimetype) && !allowedAttachmentMimeTypes.has(`application/${extension.slice(1)}`)) {
            return callback(new Error("This file type is not supported."));
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

export const messageUpload = (fieldName) => (req, res, next) => {
    attachmentParser.single(fieldName)(req, res, (error) => {
        if (error) {
            return res.status(400).json({
                message: error.code === "LIMIT_FILE_SIZE"
                    ? "Attachment must be 10 MB or smaller."
                    : error.message || "Unable to upload attachment."
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

export const storeUploadedMessageFile = async (file) => {
    if (!file) return null;
    const extension = path.extname(file.originalname || "").toLowerCase();
    const mimeType = file.mimetype || "application/octet-stream";
    const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"]);
    if (dangerousExtensions.has(extension) || !allowedExtensions.has(extension)) {
        const error = new Error("This file type is not supported.");
        error.statusCode = 400;
        throw error;
    }
    await fs.mkdir(messageUploadsDirectory, { recursive: true });
    const filename = `${randomUUID()}${extension || ".bin"}`;
    await fs.writeFile(path.join(messageUploadsDirectory, filename), file.buffer, { flag: "wx" });
    return `/uploads/message/${filename}`;
};

export const getUploadedImageFilePath = (imagePath) => {
    if (typeof imagePath !== "string") return null;
    const match = imagePath.match(
        /^\/uploads\/(profile|status|message)\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|gif|pdf|doc|docx|xls|xlsx|txt|bin))$/i
    );
    if (!match) return null;
    const directory = match[1] === "profile" ? profileUploadsDirectory : match[1] === "status" ? statusUploadsDirectory : messageUploadsDirectory;
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
