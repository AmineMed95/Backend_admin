import { MigrationInterface, QueryRunner } from "typeorm";

export class InitNewSchema1776630750748 implements MigrationInterface {
    name = 'InitNewSchema1776630750748'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_statuses" ("id" SERIAL NOT NULL, "code" character varying NOT NULL, "label" character varying NOT NULL, CONSTRAINT "UQ_cf4a8b23eb9b96fbde4d63ab8ce" UNIQUE ("code"), CONSTRAINT "PK_50cc8fb0f4810b2f3bfcef7a788" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "users" (
            "id" SERIAL NOT NULL,
            "first_name" character varying NOT NULL,
            "last_name" character varying NOT NULL,
            "email" character varying NOT NULL,
            "password" character varying NOT NULL,
            "phone" character varying,
            "organization_name" character varying,
            "activation_token" character varying,
            "reset_password_token" character varying,
            "reset_password_expires" TIMESTAMP,
            "role_id" integer NOT NULL,
            "status_id" integer,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
            CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
        )`);

                    await queryRunner.query(`CREATE TABLE "clients" (
            "id" SERIAL NOT NULL,
            "first_name" character varying NOT NULL,
            "last_name" character varying NOT NULL,
            "email" character varying NOT NULL,
            "phone" character varying,
            "access_code" character varying NOT NULL,
            "is_code_used" boolean NOT NULL DEFAULT false,
            "created_by" integer NOT NULL,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
            CONSTRAINT "UQ_clients_email" UNIQUE ("email"),
            CONSTRAINT "UQ_clients_access_code" UNIQUE ("access_code"),
            CONSTRAINT "PK_clients" PRIMARY KEY ("id")
            )`);
                    await queryRunner.query(`CREATE TABLE "kyc_records" (
                "id" SERIAL NOT NULL,
                "status" character varying NOT NULL DEFAULT 'en_attente',
                "facial_matching_score" float,
                "cin_data" jsonb,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "client_id" integer NOT NULL,
                CONSTRAINT "CHK_kyc_status" CHECK (
                    "status" IN ('valide', 'en_attente', 'non_valide')
                ),
                CONSTRAINT "UQ_kyc_records_client_id" UNIQUE ("client_id"),
                CONSTRAINT "PK_kyc_records" PRIMARY KEY ("id")
            )`);

            await queryRunner.query(`ALTER TABLE "kyc_records" 
                ADD CONSTRAINT "FK_kyc_records_client_id" 
                FOREIGN KEY ("client_id") REFERENCES "clients"("id") 
                ON DELETE CASCADE ON UPDATE NO ACTION
            `);

            await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "FK_clients_created_by" 
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_9d295cb2f8df33c080e23acfb8f" FOREIGN KEY ("status_id") REFERENCES "user_statuses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a2cecd1a3531c0b041e29ba46e1"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_9d295cb2f8df33c080e23acfb8f"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TABLE "user_statuses"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }
}