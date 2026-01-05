import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

/**
 * ConversationController
 * REST API endpoints for private messaging operations
 * Handles media uploads for direct messages (images, audio, etc.)
 */
@ApiTags('conversations')
@ApiBearerAuth('JWT')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  /**
   * Upload image for private message
   * POST /conversations/upload/image
   * @param file - The uploaded image file
   * @returns Upload result with URL
   */
  @Post('upload/image')
  @ApiOperation({ summary: 'Upload image for private message' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate image type
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 10MB');
    }

    this.logger.log(`Uploading image: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);

    const result = await this.uploadToCloudinary(file, 'image');

    return {
      success: true,
      url: result.secureUrl,
      publicId: result.publicId,
      format: result.format,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    };
  }

  /**
   * Upload audio for private message
   * POST /conversations/upload/audio
   * @param file - The uploaded audio file
   * @returns Upload result with URL and duration
   */
  @Post('upload/audio')
  @ApiOperation({ summary: 'Upload audio for private message' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate audio type
    if (!file.mimetype.startsWith('audio/')) {
      throw new BadRequestException('File must be an audio file');
    }

    // Validate file size (max 25MB for audio)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 25MB');
    }

    this.logger.log(`Uploading audio: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);

    // Cloudinary uses 'video' resource type for both video and audio
    const result = await this.uploadToCloudinary(file, 'video');

    return {
      success: true,
      url: result.secureUrl,
      publicId: result.publicId,
      duration: result.duration,
      format: result.format,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    };
  }

  /**
   * Upload video for private message
   * POST /conversations/upload/video
   * @param file - The uploaded video file
   * @returns Upload result with URL and duration
   */
  @Post('upload/video')
  @ApiOperation({ summary: 'Upload video for private message' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate video type
    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('File must be a video file');
    }

    // Validate file size (max 50MB for video)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 50MB');
    }

    this.logger.log(`Uploading video: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);

    const result = await this.uploadToCloudinary(file, 'video');

    return {
      success: true,
      url: result.secureUrl,
      publicId: result.publicId,
      duration: result.duration,
      format: result.format,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    };
  }

  /**
   * Upload any file for private message (generic endpoint)
   * POST /conversations/upload/file
   * @param file - The uploaded file
   * @returns Upload result with URL
   */
  @Post('upload/file')
  @ApiOperation({ summary: 'Upload file for private message' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file size (max 25MB)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 25MB');
    }

    this.logger.log(`Uploading file: ${file.originalname}, size: ${file.size}, type: ${file.mimetype}`);

    // Determine resource type based on MIME type
    let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'raw';

    if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      resourceType = 'video';
    }

    const result = await this.uploadToCloudinary(file, resourceType);

    return {
      success: true,
      url: result.secureUrl,
      publicId: result.publicId,
      duration: result.duration,
      format: result.format,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    };
  }

  /**
   * Upload file to Cloudinary
   * @param file - The file to upload
   * @param resourceType - Type of resource (image, video, raw)
   * @returns Cloudinary upload result with URL
   */
  private async uploadToCloudinary(
    file: Express.Multer.File,
    resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto',
  ): Promise<{ url: string; secureUrl: string; publicId: string; duration?: number; format: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: 'conversation-media', // Separate folder for private messages
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload error: ${error?.message || 'Unknown error'}`);
            reject(new BadRequestException('File upload failed'));
          } else {
            this.logger.log(`✅ File uploaded successfully: ${result.secure_url}`);
            resolve({
              url: result.url,
              secureUrl: result.secure_url,
              publicId: result.public_id,
              duration: result.duration, // For audio/video
              format: result.format,
            });
          }
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
