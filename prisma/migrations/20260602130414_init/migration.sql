-- CreateTable
CREATE TABLE "SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "logoUrl" TEXT,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRCode" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'unregistered',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "registeredAt" TIMESTAMP(3),

    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "notificationPreference" TEXT NOT NULL DEFAULT 'both',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appliance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "applianceType" TEXT NOT NULL,
    "cylinderSizeKg" DOUBLE PRECISION NOT NULL,
    "clientEstimatedDurationMonths" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CylinderCycle" (
    "id" TEXT NOT NULL,
    "applianceId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "baselineUsed" TEXT NOT NULL,
    "predictedEmptyDate" TIMESTAMP(3) NOT NULL,
    "actualDeliveryDate" TIMESTAMP(3),
    "actualDurationMonths" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CylinderCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "addressIsPermanentChange" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "applianceId" TEXT NOT NULL,
    "cylinderCycleId" TEXT NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "applianceId" TEXT,
    "type" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscalationFlag" (
    "id" TEXT NOT NULL,
    "applianceId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "raisedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "clearedByOrderId" TEXT,

    CONSTRAINT "EscalationFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndustryAverage" (
    "cylinderSizeKg" DOUBLE PRECISION NOT NULL,
    "avgDurationMonths" DOUBLE PRECISION NOT NULL
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subscription" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "SuperAdmin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_contactEmail_key" ON "Vendor"("contactEmail");

-- CreateIndex
CREATE INDEX "QRCode_vendorId_idx" ON "QRCode"("vendorId");

-- CreateIndex
CREATE INDEX "QRCode_state_idx" ON "QRCode"("state");

-- CreateIndex
CREATE UNIQUE INDEX "Client_qrCodeId_key" ON "Client"("qrCodeId");

-- CreateIndex
CREATE INDEX "Client_vendorId_idx" ON "Client"("vendorId");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Appliance_clientId_idx" ON "Appliance"("clientId");

-- CreateIndex
CREATE INDEX "CylinderCycle_applianceId_idx" ON "CylinderCycle"("applianceId");

-- CreateIndex
CREATE INDEX "CylinderCycle_status_idx" ON "CylinderCycle"("status");

-- CreateIndex
CREATE INDEX "Order_vendorId_idx" ON "Order"("vendorId");

-- CreateIndex
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Notification_clientId_idx" ON "Notification"("clientId");

-- CreateIndex
CREATE INDEX "Notification_scheduledFor_sentAt_idx" ON "Notification"("scheduledFor", "sentAt");

-- CreateIndex
CREATE INDEX "EscalationFlag_vendorId_clearedAt_idx" ON "EscalationFlag"("vendorId", "clearedAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_type_key" ON "NotificationTemplate"("type");

-- CreateIndex
CREATE UNIQUE INDEX "IndustryAverage_cylinderSizeKg_key" ON "IndustryAverage"("cylinderSizeKg");

-- CreateIndex
CREATE INDEX "PushSubscription_clientId_idx" ON "PushSubscription"("clientId");

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "QRCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appliance" ADD CONSTRAINT "Appliance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CylinderCycle" ADD CONSTRAINT "CylinderCycle_applianceId_fkey" FOREIGN KEY ("applianceId") REFERENCES "Appliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_applianceId_fkey" FOREIGN KEY ("applianceId") REFERENCES "Appliance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_cylinderCycleId_fkey" FOREIGN KEY ("cylinderCycleId") REFERENCES "CylinderCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_applianceId_fkey" FOREIGN KEY ("applianceId") REFERENCES "Appliance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationFlag" ADD CONSTRAINT "EscalationFlag_applianceId_fkey" FOREIGN KEY ("applianceId") REFERENCES "Appliance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationFlag" ADD CONSTRAINT "EscalationFlag_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
