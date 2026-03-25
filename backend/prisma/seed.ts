import { PrismaClient, UserType, TransactionType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Nettoyage de la base...");
  await prisma.energyTransaction.deleteMany();
  await prisma.storageContract.deleteMany();
  await prisma.storageOffer.deleteMany();
  await prisma.battery.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  console.log("Création des utilisateurs...");

  const host1 = await prisma.user.create({
    data: {
      email: "marie@gridshare.fr",
      password,
      name: "Marie Durand",
      type: UserType.HOST,
      estimatedProduction: 9.5,
    },
  });

  const host2 = await prisma.user.create({
    data: {
      email: "pierre@gridshare.fr",
      password,
      name: "Pierre Martin",
      type: UserType.HOST,
      estimatedProduction: 6.0,
    },
  });

  const host3 = await prisma.user.create({
    data: {
      email: "sophie@gridshare.fr",
      password,
      name: "Sophie Bernard",
      type: UserType.HOST,
      estimatedProduction: 12.0,
    },
  });

  const client1 = await prisma.user.create({
    data: {
      email: "alex@gridshare.fr",
      password,
      name: "Alex Moreau",
      type: UserType.CLIENT,
      estimatedProduction: 3.0,
    },
  });

  const client2 = await prisma.user.create({
    data: {
      email: "lucas@gridshare.fr",
      password,
      name: "Lucas Petit",
      type: UserType.CLIENT,
      estimatedProduction: 0,
    },
  });

  const client3 = await prisma.user.create({
    data: {
      email: "emma@gridshare.fr",
      password,
      name: "Emma Leroy",
      type: UserType.CLIENT,
      estimatedProduction: 2.5,
    },
  });

  console.log("Création des batteries...");

  const bat1 = await prisma.battery.create({
    data: { userId: host1.id, capacityKwh: 13.5, availableKwh: 3.5, label: "Tesla Powerwall" },
  });
  const bat2 = await prisma.battery.create({
    data: { userId: host1.id, capacityKwh: 10.0, availableKwh: 5.0, label: "BYD HVS" },
  });
  const bat3 = await prisma.battery.create({
    data: { userId: host2.id, capacityKwh: 9.8, availableKwh: 2.8, label: "Enphase IQ 10T" },
  });
  const bat4 = await prisma.battery.create({
    data: { userId: host3.id, capacityKwh: 16.0, availableKwh: 6.0, label: "Sonnen Eco 16" },
  });
  const bat5 = await prisma.battery.create({
    data: { userId: host3.id, capacityKwh: 7.0, availableKwh: 7.0, label: "Pylontech US3000" },
  });

  console.log("Création des offres de stockage...");

  const offer1 = await prisma.storageOffer.create({
    data: {
      hostId: host1.id,
      batteryId: bat1.id,
      capacityKwh: 10.0,
      remainingKwh: 3.0,
      pricePerKwh: 0.12,
      status: "ACTIVE",
    },
  });

  const offer2 = await prisma.storageOffer.create({
    data: {
      hostId: host1.id,
      batteryId: bat2.id,
      capacityKwh: 5.0,
      remainingKwh: 5.0,
      pricePerKwh: 0.15,
      status: "ACTIVE",
    },
  });

  const offer3 = await prisma.storageOffer.create({
    data: {
      hostId: host2.id,
      batteryId: bat3.id,
      capacityKwh: 7.0,
      remainingKwh: 2.0,
      pricePerKwh: 0.10,
      status: "ACTIVE",
    },
  });

  const offer4 = await prisma.storageOffer.create({
    data: {
      hostId: host3.id,
      batteryId: bat4.id,
      capacityKwh: 10.0,
      remainingKwh: 4.0,
      pricePerKwh: 0.14,
      status: "ACTIVE",
    },
  });

  console.log("Création des contrats...");

  const contract1 = await prisma.storageContract.create({
    data: {
      offerId: offer1.id,
      clientId: client1.id,
      allocatedKwh: 5.0,
      usedKwh: 3.2,
      pricePerKwh: 0.12,
      status: "ACTIVE",
    },
  });

  const contract2 = await prisma.storageContract.create({
    data: {
      offerId: offer1.id,
      clientId: client2.id,
      allocatedKwh: 2.0,
      usedKwh: 1.5,
      pricePerKwh: 0.12,
      status: "ACTIVE",
    },
  });

  const contract3 = await prisma.storageContract.create({
    data: {
      offerId: offer3.id,
      clientId: client1.id,
      allocatedKwh: 3.0,
      usedKwh: 2.1,
      pricePerKwh: 0.10,
      status: "ACTIVE",
    },
  });

  const contract4 = await prisma.storageContract.create({
    data: {
      offerId: offer3.id,
      clientId: client3.id,
      allocatedKwh: 2.0,
      usedKwh: 0.8,
      pricePerKwh: 0.10,
      status: "ACTIVE",
    },
  });

  const contract5 = await prisma.storageContract.create({
    data: {
      offerId: offer4.id,
      clientId: client2.id,
      allocatedKwh: 4.0,
      usedKwh: 2.5,
      pricePerKwh: 0.14,
      status: "ACTIVE",
    },
  });

  const contract6 = await prisma.storageContract.create({
    data: {
      offerId: offer4.id,
      clientId: client3.id,
      allocatedKwh: 2.0,
      usedKwh: 1.0,
      pricePerKwh: 0.14,
      status: "ACTIVE",
    },
  });

  console.log("Génération des transactions sur 14 jours...");

  const now = new Date();
  const contracts = [contract1, contract2, contract3, contract4, contract5, contract6];

  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);

    const txCount = 3 + Math.floor(Math.random() * 5);

    for (let i = 0; i < txCount; i++) {
      const contract = contracts[Math.floor(Math.random() * contracts.length)];
      const isStore = Math.random() > 0.35;
      const type: TransactionType = isStore ? "STORE" : "RESTORE";
      const amountKwh = parseFloat((0.3 + Math.random() * 2.5).toFixed(2));
      const hour = 6 + Math.floor(Math.random() * 16);
      const minute = Math.floor(Math.random() * 60);

      const createdAt = new Date(day);
      createdAt.setHours(hour, minute, 0, 0);

      await prisma.energyTransaction.create({
        data: {
          contractId: contract.id,
          type,
          amountKwh,
          pricePerKwh: contract.pricePerKwh,
          totalCost: parseFloat((amountKwh * contract.pricePerKwh).toFixed(4)),
          createdAt,
        },
      });
    }
  }

  const totalTx = await prisma.energyTransaction.count();
  console.log(`Seed terminé ! ${totalTx} transactions créées.`);
  console.log("");
  console.log("Comptes de démo (mot de passe: password123) :");
  console.log("  Hôtes  : marie@gridshare.fr, pierre@gridshare.fr, sophie@gridshare.fr");
  console.log("  Clients: alex@gridshare.fr, lucas@gridshare.fr, emma@gridshare.fr");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
