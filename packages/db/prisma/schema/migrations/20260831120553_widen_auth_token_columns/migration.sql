-- AlterTable
ALTER TABLE `ubs_auth_account` MODIFY `accessToken` TEXT NULL,
    MODIFY `refreshToken` TEXT NULL,
    MODIFY `idToken` TEXT NULL;

-- AlterTable
ALTER TABLE `ubs_auth_verification` MODIFY `value` TEXT NOT NULL;
