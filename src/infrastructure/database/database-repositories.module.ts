import { Global, Module } from '@nestjs/common';
import { UsersRepository } from './repositories/users.repository';
import { ProfilesRepository } from './repositories/profiles.repository';

@Global()
@Module({
  providers: [UsersRepository, ProfilesRepository],
  exports: [UsersRepository, ProfilesRepository],
})
export class DatabaseRepositoriesModule {}
