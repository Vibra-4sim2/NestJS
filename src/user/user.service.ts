import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
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




}


