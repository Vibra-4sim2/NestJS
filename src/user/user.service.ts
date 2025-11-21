import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import cloudinary from 'src/config/cloudinary.config';
import * as streamifier from 'streamifier';
@Injectable()
export class UserService {
async setUserImage(id: string, file: Express.Multer.File): Promise<User> {
  const imageUrl = await this.uploadToCloudinary(file);

  const user = await this.userModel
    .findByIdAndUpdate(id, { avatar: imageUrl }, { new: true })
    .exec();

  if (!user) throw new NotFoundException(`User with id ${id} not found`);

  return user;
}


  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // ensure password is hashed
    const saltRounds = 10;
    const hashed = await bcrypt.hash((createUserDto as any).password, saltRounds);
    const toSave: any = { ...createUserDto, password: hashed, role: (createUserDto as any).role ?? 'USER' };
    const newUser = new this.userModel(toSave);
    return newUser.save();
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findOneById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec().catch(err => { throw new NotFoundException('id not found') })
  }

  async findOneByEmail(email: string): Promise<(User & { _id: string }) | null> {
    return this.userModel
      .findOne({ email })
      .lean<User & { _id: string }>()
      .exec();
  }

  //returns first user with the same name
  async findOneByFirstName(name: string): Promise<User | null> {
    return this.userModel.findOne({ firstName: name }).exec().catch(err => { throw new NotFoundException('name not found') })
  }

  //returns all users with the same firstname
  async findAllbyFirstName(name: string): Promise<User[] | null> {
    return this.userModel.find({ firstName: name }).exec().catch(err => { throw new NotFoundException('name not found') })
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User | null> {
    // prevent direct password change without hashing here; if provided, hash it
    const update: any = { ...updateUserDto };
    if ((updateUserDto as any).password) {
      update.password = await bcrypt.hash((updateUserDto as any).password, 10);
    }
    return this.userModel.findByIdAndUpdate(id, update, { new: true }).exec()
    .catch(err => { throw new NotFoundException('id not found') })
  }

  async remove(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec().catch(err => { throw new NotFoundException('id not found') })
  }

  // Helper: set (and hash) a new password by user id
  async setPassword(id: string, rawPassword: string): Promise<User> {
    const hashed = await bcrypt.hash(rawPassword, 10);
    const user = await this.userModel.findByIdAndUpdate(
      id,
      { password: hashed },
      { new: true },
    ).exec();
    if (!user) throw new NotFoundException(`User with id ${id} not found`);
    return user;
  }

  // Helper: update (and hash) password by email (used in reset password flows)
  async updatePasswordByEmail(email: string, rawPassword: string): Promise<User> {
    const hashed = await bcrypt.hash(rawPassword, 10);
    const user = await this.userModel.findOneAndUpdate(
      { email },
      { password: hashed },
      { new: true },
    ).exec();
    if (!user) throw new NotFoundException(`User with email ${email} not found`);
    return user;
  }


async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'avatars' },
      (error, result) => {
        if (error) return reject(error);
        if (!result || !result.secure_url) {
          return reject(new Error('Cloudinary upload failed or returned no URL'));
        }
        resolve(result.secure_url);
      },
    );
    streamifier.createReadStream(file.buffer)
      .on('error', reject)
      .pipe(uploadStream);
  });
}

  // ==================== FOLLOWERS SYSTEM ====================

  /**
   * Follow a user
   */
  async followUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const currentUser = await this.userModel.findById(currentUserId);
    const targetUser = await this.userModel.findById(targetUserId);

    if (!currentUser || !targetUser) {
      throw new NotFoundException('User not found');
    }

    const targetObjectId = new Types.ObjectId(targetUserId);

    // Check if already following
    if (currentUser.following.some(id => id.toString() === targetUserId)) {
      throw new BadRequestException('You are already following this user');
    }

    // Add to current user's following list
    await this.userModel.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: targetObjectId },
      $inc: { followingCount: 1 },
    });

    // Add to target user's followers list
    await this.userModel.findByIdAndUpdate(targetUserId, {
      $addToSet: { followers: new Types.ObjectId(currentUserId) },
      $inc: { followersCount: 1 },
    });

    return {
      success: true,
      message: `You are now following ${targetUser.firstName} ${targetUser.lastName}`,
    };
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Invalid operation');
    }

    const currentUser = await this.userModel.findById(currentUserId);
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Check if not following
    if (!currentUser.following.some(id => id.toString() === targetUserId)) {
      throw new BadRequestException('You are not following this user');
    }

    const targetObjectId = new Types.ObjectId(targetUserId);
    const currentObjectId = new Types.ObjectId(currentUserId);

    // Remove from following list
    await this.userModel.findByIdAndUpdate(currentUserId, {
      $pull: { following: targetObjectId },
      $inc: { followingCount: -1 },
    });

    // Remove from followers list
    await this.userModel.findByIdAndUpdate(targetUserId, {
      $pull: { followers: currentObjectId },
      $inc: { followersCount: -1 },
    });

    return {
      success: true,
      message: 'Successfully unfollowed user',
    };
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const user = await this.userModel
      .findById(userId)
      .populate({
        path: 'followers',
        select: 'firstName lastName email avatar followersCount followingCount',
        options: { skip, limit },
      });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      followers: user.followers,
      total: user.followersCount,
      page,
      limit,
      totalPages: Math.ceil(user.followersCount / limit),
    };
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const user = await this.userModel
      .findById(userId)
      .populate({
        path: 'following',
        select: 'firstName lastName email avatar followersCount followingCount',
        options: { skip, limit },
      });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      following: user.following,
      total: user.followingCount,
      page,
      limit,
      totalPages: Math.ceil(user.followingCount / limit),
    };
  }

  /**
   * Check if user A is following user B
   */
  async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    const user = await this.userModel.findById(currentUserId);
    if (!user) return false;

    return user.following.some(id => id.toString() === targetUserId);
  }

  /**
   * Get follow statistics
   */
  async getFollowStats(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      followersCount: user.followersCount,
      followingCount: user.followingCount,
    };
  }

  /**
   * Get mutual followers (users who follow each other)
   */
  async getMutualFollowers(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const mutualFollowers = await this.userModel.find({
      _id: { $in: user.following },
      following: new Types.ObjectId(userId),
    }).select('firstName lastName email avatar followersCount followingCount');

    return {
      mutualFollowers,
      count: mutualFollowers.length,
    };
  }

  /**
   * Get follow suggestions (popular users not followed yet)
   */
  async getFollowSuggestions(userId: string, limit = 10) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const suggestions = await this.userModel
      .find({
        _id: {
          $ne: userId, // Not the current user
          $nin: user.following, // Not already following
        },
      })
      .sort({ followersCount: -1 }) // Sort by popularity
      .limit(limit)
      .select('firstName lastName email avatar followersCount followingCount');

    return {
      suggestions,
      count: suggestions.length,
    };
  }


}




