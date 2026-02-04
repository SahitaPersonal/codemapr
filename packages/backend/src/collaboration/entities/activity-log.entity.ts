import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CollaborationSession } from './collaboration-session.entity';

@Entity('activity_logs')
@Index(['sessionId'])
@Index(['userId'])
@Index(['action'])
@Index(['timestamp'])
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  sessionId: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 255 })
  username: string;

  @Column({ length: 100 })
  action: string;

  @Column('text', { 
    default: '{}',
    transformer: {
      to: (value: any) => JSON.stringify(value || {}),
      from: (value: string) => {
        try {
          return JSON.parse(value || '{}');
        } catch {
          return {};
        }
      },
    },
  })
  details: Record<string, any>;

  @CreateDateColumn()
  timestamp: Date;

  @ManyToOne(() => CollaborationSession, session => session.activityLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'sessionId' })
  session: CollaborationSession;
}