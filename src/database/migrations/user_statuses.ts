import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateUserStatusesTable202604190001 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "user_statuses",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          {
            name: "code",
            type: "varchar",
            isUnique: true,
          },
          {
            name: "label",
            type: "varchar",
          },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("user_statuses");
  }
}