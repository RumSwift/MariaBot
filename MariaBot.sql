# Host: 209.74.87.174  (Version 11.7.2-MariaDB-ubu2404)
# Date: 2025-07-16 20:25:56
# Generator: MySQL-Front 6.0  (Build 2.20)


#
# Structure for table "ActiveDMmods"
#

CREATE TABLE `ActiveDMmods` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `DiscordID` varchar(20) NOT NULL,
  `DiscordName` varchar(100) NOT NULL,
  `Language` varchar(5) NOT NULL,
  `MessageText` text NOT NULL,
  `ReportedPlayerID` varchar(20) DEFAULT NULL,
  `ReportedPlayerName` varchar(100) DEFAULT NULL,
  `ReportedMessage` varchar(500) DEFAULT NULL,
  `ImageURL` varchar(500) DEFAULT NULL,
  `ModChannelID` varchar(20) NOT NULL,
  `ModMessageID` varchar(20) NOT NULL,
  `CreatedAt` timestamp NULL DEFAULT current_timestamp(),
  `LastActivity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `Status` enum('OPEN','REPLIED','CLOSED') DEFAULT 'OPEN',
  PRIMARY KEY (`ID`),
  KEY `idx_discord_id` (`DiscordID`),
  KEY `idx_mod_message_id` (`ModMessageID`),
  KEY `idx_status` (`Status`),
  KEY `idx_language` (`Language`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

#
# Structure for table "ActiveModMails"
#

CREATE TABLE `ActiveModMails` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `DiscordID` varchar(20) NOT NULL,
  `ThreadID` varchar(20) NOT NULL,
  `ChannelID` varchar(20) NOT NULL,
  `TeamLanguage` varchar(5) NOT NULL,
  `Title` varchar(255) DEFAULT NULL,
  `CreatedAt` timestamp NULL DEFAULT current_timestamp(),
  `LastActivity` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `Status` enum('OPEN','CLOSED') DEFAULT 'OPEN',
  PRIMARY KEY (`ID`),
  KEY `idx_thread_id` (`ThreadID`),
  KEY `idx_status` (`Status`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

#
# Structure for table "AutoMessages"
#

CREATE TABLE `AutoMessages` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `ChannelID` varchar(255) DEFAULT NULL,
  `Message` varchar(1000) DEFAULT NULL,
  `Title` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

#
# Structure for table "BannedEmojis"
#

CREATE TABLE `BannedEmojis` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `EmojiIdentifier` varchar(255) NOT NULL,
  `EmojiType` enum('unicode','custom') NOT NULL,
  `EmojiName` varchar(100) DEFAULT NULL,
  `EmojiID` varchar(50) DEFAULT NULL,
  `Description` varchar(500) DEFAULT NULL,
  `AddedByDiscordID` varchar(50) NOT NULL,
  `AddedByDiscordName` varchar(100) DEFAULT NULL,
  `CreatedAt` timestamp NULL DEFAULT current_timestamp(),
  `UpdatedAt` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `IsActive` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`ID`),
  UNIQUE KEY `EmojiIdentifier` (`EmojiIdentifier`),
  KEY `idx_emoji_identifier` (`EmojiIdentifier`),
  KEY `idx_is_active` (`IsActive`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

#
# Structure for table "ModMailBan"
#

CREATE TABLE `ModMailBan` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `DiscordID` varchar(20) DEFAULT NULL,
  `Timestamp` timestamp NULL DEFAULT current_timestamp(),
  `BannedByID` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

#
# Structure for table "Sanctions"
#

CREATE TABLE `Sanctions` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `DiscordID` bigint(8) DEFAULT NULL COMMENT 'Sanctioned Discord User ID',
  `DiscordName` varchar(255) DEFAULT NULL,
  `PrivateReason` varchar(500) DEFAULT NULL,
  `PublicReason` varchar(500) DEFAULT NULL,
  `SanctionType` varchar(255) DEFAULT NULL,
  `Punishment` varchar(255) DEFAULT NULL,
  `MessageLink` varchar(1000) DEFAULT NULL,
  `Timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `ModDiscordID` bigint(8) DEFAULT NULL,
  `ModDiscordName` varchar(255) DEFAULT NULL,
  `SanctionLink` varchar(2000) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

#
# Structure for table "UserNotes"
#

CREATE TABLE `UserNotes` (
  `ID` int(11) NOT NULL AUTO_INCREMENT,
  `DiscordID` varchar(255) NOT NULL,
  `AddedByDiscordID` varchar(255) NOT NULL,
  `NoteText` text NOT NULL,
  `Timestamp` timestamp NULL DEFAULT current_timestamp(),
  `LinkedMessage` varchar(500) DEFAULT NULL,
  `EmbedLink` varchar(500) DEFAULT NULL,
  `Title` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `idx_discord_id` (`DiscordID`),
  KEY `idx_added_by` (`AddedByDiscordID`),
  KEY `idx_timestamp` (`Timestamp`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;
