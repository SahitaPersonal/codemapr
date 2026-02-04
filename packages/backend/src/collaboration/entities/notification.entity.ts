import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type NotificationType = 'session_invite' | 'annotation_added' | 'annotation_reply' | 'session_updated' | 'user_joined' | 'user_left';
export type NotificationStatus = 'unread' | 'read' | 'dismissed';

@Entity('notifications')
@Index(['userId'])
@Index(['status'])
@Index(['type'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  userId: string;

  @Column({ length: 255, nullable: true })
  sessionId: string;

  @Column({ length: 100 })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  message: string;

  @Column({ length: 50, default: 'unread' })
  status: NotificationStatus;

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
  data: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  readAt: Date;
}