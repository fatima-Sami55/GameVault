/****** Object:  Table [dbo].[billing] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[billing](
	[bill_id] [int] NOT NULL,
	[user_id] [uniqueidentifier] NULL,
	[date] [date] NULL,
	[amount] [decimal](10, 2) NULL,
PRIMARY KEY CLUSTERED 
(
	[bill_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[card_details] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[card_details](
	[c_id] [int] NOT NULL,
	[user_id] [uniqueidentifier] NULL,
	[c_number] [char](16) NULL,
	[cvc] [char](3) NULL,
	[expiry_date] [date] NULL,
	[c_name] [varchar](100) NULL,
	[type] [varchar](50) NULL,
PRIMARY KEY CLUSTERED 
(
	[c_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[cart] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[cart](
	[user_id] [uniqueidentifier] NULL,
	[cart_id] [int] IDENTITY(1,1) NOT NULL,
 CONSTRAINT [PK_cart] PRIMARY KEY CLUSTERED 
(
	[cart_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[cart_products] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[cart_products](
	[cart_id] [int] NOT NULL,
	[pid] [int] NOT NULL,
	[quantity] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[cart_id] ASC,
	[pid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[inventory] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[inventory](
	[pid] [int] NOT NULL,
	[quantity] [int] NULL,
	[discount] [decimal](5, 2) NULL,
PRIMARY KEY CLUSTERED 
(
	[pid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[orders] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[orders](
	[o_id] [int] NOT NULL,
	[user_id] [uniqueidentifier] NULL,
	[o_status] [varchar](50) NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[o_id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[payment] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[payment](
	[pid] [int] NOT NULL,
	[bill_id] [int] NULL,
	[p_method] [varchar](50) NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[pid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

/****** Object:  Table [dbo].[product] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[product](
	[pid] [int] NOT NULL,
	[name] [nvarchar](255) NOT NULL,
	[description] [nvarchar](max) NOT NULL,
	[price] [decimal](10, 2) NOT NULL,
	[genre] [nvarchar](100) NOT NULL,
	[status] [nvarchar](50) NOT NULL,
	[img] [nvarchar](255) NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[pid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY] TEXTIMAGE_ON [PRIMARY]
GO

/****** Object:  Table [dbo].[users] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[users](
	[uuid] [uniqueidentifier] NOT NULL,
	[name] [varchar](100) NOT NULL,
	[email] [varchar](100) NOT NULL,
	[password] [varchar](200) NOT NULL,
	[phone_number] [varchar](15) NOT NULL,
	[role] [varchar](20) NOT NULL,
	[created_at] [datetime] NULL,
PRIMARY KEY CLUSTERED 
(
	[uuid] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY],
 CONSTRAINT [unique_email] UNIQUE NONCLUSTERED 
(
	[email] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

-- Add defaults
ALTER TABLE [dbo].[orders] ADD DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[payment] ADD DEFAULT (getdate()) FOR [created_at]
GO
ALTER TABLE [dbo].[users] ADD DEFAULT ('user') FOR [role]
GO
ALTER TABLE [dbo].[users] ADD DEFAULT (getdate()) FOR [created_at]
GO

-- Add foreign key constraints
ALTER TABLE [dbo].[billing] WITH CHECK ADD FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([uuid])
GO
ALTER TABLE [dbo].[card_details] WITH CHECK ADD FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([uuid])
GO
ALTER TABLE [dbo].[cart] WITH CHECK ADD CONSTRAINT [FK__cart__user_id__59FA5E80] FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([uuid])
ON DELETE CASCADE
GO
ALTER TABLE [dbo].[cart] CHECK CONSTRAINT [FK__cart__user_id__59FA5E80]
GO
ALTER TABLE [dbo].[cart_products] WITH CHECK ADD FOREIGN KEY([pid])
REFERENCES [dbo].[product] ([pid])
GO
ALTER TABLE [dbo].[cart_products] WITH CHECK ADD CONSTRAINT [FK_cart_products_cart_id] FOREIGN KEY([cart_id])
REFERENCES [dbo].[cart] ([cart_id])
GO
ALTER TABLE [dbo].[cart_products] CHECK CONSTRAINT [FK_cart_products_cart_id]
GO
ALTER TABLE [dbo].[inventory] WITH CHECK ADD FOREIGN KEY([pid])
REFERENCES [dbo].[product] ([pid])
GO
ALTER TABLE [dbo].[orders] WITH CHECK ADD FOREIGN KEY([user_id])
REFERENCES [dbo].[users] ([uuid])
GO
ALTER TABLE [dbo].[payment] WITH CHECK ADD FOREIGN KEY([bill_id])
REFERENCES [dbo].[billing] ([bill_id])
GO
ALTER TABLE [dbo].[users] WITH CHECK ADD CONSTRAINT [chk_role] CHECK (([role]='admin' OR [role]='user'))
GO
ALTER TABLE [dbo].[users] CHECK CONSTRAINT [chk_role]
GO

/****** Object:  Trigger [dbo].[trg_InsteadOfInsertProduct] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TRIGGER [dbo].[trg_InsteadOfInsertProduct]
ON [dbo].[product]
INSTEAD OF INSERT
AS
BEGIN
    DECLARE @newPid INT;
    SELECT @newPid = ISNULL(MAX(pid), 0) + 1 FROM Product;
    INSERT INTO Product (pid, name, description, price, genre, status, img)
    SELECT @newPid, name, description, price, genre, status, img
    FROM inserted;
END;
GO
ALTER TABLE [dbo].[product] ENABLE TRIGGER [trg_InsteadOfInsertProduct]
GO
