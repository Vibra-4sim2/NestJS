import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class FollowersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

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
    const currentObjectId = new Types.ObjectId(currentUserId);

    // Check if already following
    if (currentUser.following.includes(targetObjectId)) {
      throw new BadRequestException('You are already following this user');
    }

    // Add to following list
    await this.userModel.findByIdAndUpdate(currentUserId, {
      $addToSet: { following: targetObjectId },
      $inc: { followingCount: 1 },
    });

    // Add to followers list
    await this.userModel.findByIdAndUpdate(targetUserId, {
      $addToSet: { followers: currentObjectId },
      $inc: { followersCount: 1 },
    });

    return { success: true, message: 'Successfully followed user' };
  }

  async unfollowUser(currentUserId: string, targetUserId: string) {
    if (currentUserId === targetUserId) {
      throw new BadRequestException('Invalid operation');
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

    return { success: true, message: 'Successfully unfollowed user' };
  }

  async getFollowers(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const user = await this.userModel
      .findById(userId)
      .populate({
        path: 'followers',
        select: 'name email avatar bio followersCount followingCount',
        options: { skip, limit },
      });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const total = user.followersCount;

    return {
      followers: user.followers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getFollowing(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const user = await this.userModel
      .findById(userId)
      .populate({
        path: 'following',
        select: 'name email avatar bio followersCount followingCount',
        options: { skip, limit },
      });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const total = user.followingCount;

    return {
      following: user.following,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async isFollowing(currentUserId: string, targetUserId: string): Promise<boolean> {
    const user = await this.userModel.findById(currentUserId);
    if (!user) return false;

    return user.following.some(id => id.toString() === targetUserId);
  }

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
}
