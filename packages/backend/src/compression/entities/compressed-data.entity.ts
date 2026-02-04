import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('compressed_data')
@Index(['key'], { unique: true })
@Index(['tags'])
@Index(['expiresAt'])
@Index(['createdAt'])
@Index(['lastAccessedAt'])
export class CompressedDataEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  key: string;

  @Column({ type: 'blob' })
  compressedData: Buffer;

  @Column({ type: 'integer' })
  originalSize: number;

  @Column({ type: 'integer' })
  compressedSize: number;

  @Column({ type: 'float' })
  compressionRatio: number;

  @Column({ type: 'varchar', length: 50 })
  algorithm: string;

  @Column({ type: 'varchar', length: 64 })
  checksum: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[];

  @Column({ type: 'datetime', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  lastAccessedAt: Date | null;

  @Column({ type: 'integer', default: 0 })
  accessCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}