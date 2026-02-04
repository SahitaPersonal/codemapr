import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CollaborationSession } from './collaboration-session.entity';

export type ParticipantRole = 'owner' | 'editor' | 'viewer';

@Entity('session_participants')
@Index(['sessionId', 'userId'], { unique: true })
@Index(['userId'])
export class SessionParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  sessionId: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 255 })
  username: string;

  @Column({ length: 50, default: 'editor' })
  role: ParticipantRole;

  @CreateDateColumn()
  joinedAt: Date;

  @UpdateDateColumn()
  lastActivity: Date;

  @Column('text', { 
    default: '[]',
    transformer: {
      to: (value: string[]) => JSON.stringify(value || []),
      from: (value: string) => {
        try {
          return JSON.parse(value || '[]');
        } catch {
          return [];
        }
      },
    },
  })
  permissions: string[];

  @Column('text', { 
    nullable: true,
    transformer: {
      to: (value: any) => value ? JSON.stringify(value) : null,
      from: (value: string) => {
        if (!value) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      },
    },
  })
  metadata: Record<string, any>;

  @ManyToOne(() => CollaborationSession, session => session.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: CollaborationSession;
}