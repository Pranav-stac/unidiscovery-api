import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatHistoryTurnDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @MaxLength(4000)
  content!: string;
}

export class ChatScreenContextDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  phase?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  pageTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  focusTopic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12000)
  visibleText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8000)
  currentQuestion?: string;

  @IsOptional()
  @IsInt()
  questionIndex?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  selectedAnswer?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryTurnDto)
  recentMessages?: ChatHistoryTurnDto[];
}
