const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../../src/shared/utils/crypto');
const { USER_ROLES } = require('../../src/config/constants');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await hashPassword('admin123');
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@d-ride.com' },
    update: {},
    create: {
      email: 'admin@d-ride.com',
      password: adminPassword,
      fullName: 'System Administrator',
      role: USER_ROLES.ADMIN,
      isActive: true
    }
  });

  console.log('✅ Admin user created:', admin.email);

  // Create sample users
  const userPassword = await hashPassword('user123');
  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      fullName: 'John Doe',
      phoneNumber: '+1234567890',
      role: USER_ROLES.USER,
      locationState: 'Lagos',
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true
    }
  });

  console.log('✅ Sample user created:', user.email);

  // Create sample driver
  const driverPassword = await hashPassword('driver123');
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver@example.com' },
    update: {},
    create: {
      email: 'driver@example.com',
      password: driverPassword,
      fullName: 'Jane Smith',
      phoneNumber: '+1234567891',
      role: USER_ROLES.DRIVER,
      locationState: 'Lagos',
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true
    }
  });

  const driver = await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      status: 'OFFLINE',
      overallKycStatus: 'NOT_STARTED',
      todaysEarnings: 0,
      totalEarnings: 0,
      completedCount: 0,
      rating: 0,
      totalRatings: 0,
      isAvailable: false
    }
  });

  // Create vehicle for driver
  const vehicle = await prisma.vehicle.upsert({
    where: { driverId: driver.id },
    update: {},
    create: {
      driverId: driver.id,
      vehicleType: 'BIKE',
      plateNumber: 'ABC123',
      vehicleModel: 'Honda CB150',
      vehicleColor: 'Red',
      vehicleYear: 2022,
      make: 'Honda'
    }
  });

  console.log('✅ Sample driver created:', driverUser.email);
  console.log('✅ Vehicle created for driver');

  // Create sample delivery
  const delivery = await prisma.delivery.create({
    data: {
      userId: user.id,
      pickupAddress: {
        street: '123 Main Street',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
        latitude: 6.5244,
        longitude: 3.3792
      },
      dropoffAddress: {
        street: '456 Park Avenue',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100002',
        latitude: 6.5344,
        longitude: 3.3892
      },
      receiverPhoneNumber: '+1234567892',
      estimatedFare: 1500.00,
      distance: 5.2,
      duration: 15,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH',
      packageDetails: {
        weight: 2.5,
        dimensions: {
          length: 30,
          width: 20,
          height: 15
        },
        description: 'Small package',
        isFragile: false,
        requiresSpecialHandling: false
      }
    }
  });

  console.log('✅ Sample delivery created');

  // Create sample saved addresses
  const homeAddress = await prisma.savedAddress.upsert({
    where: { 
      userId_addressType: {
        userId: user.id,
        addressType: 'HOME'
      }
    },
    update: {},
    create: {
      userId: user.id,
      addressType: 'HOME',
      address: {
        street: '123 Main Street',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100001',
        latitude: 6.5244,
        longitude: 3.3792
      },
      isDefault: true
    }
  });

  const workAddress = await prisma.savedAddress.upsert({
    where: { 
      userId_addressType: {
        userId: user.id,
        addressType: 'WORK'
      }
    },
    update: {},
    create: {
      userId: user.id,
      addressType: 'WORK',
      address: {
        street: '789 Business District',
        city: 'Lagos',
        state: 'Lagos',
        country: 'Nigeria',
        postalCode: '100003',
        latitude: 6.5144,
        longitude: 3.3692
      },
      isDefault: false
    }
  });

  console.log('✅ Sample saved addresses created');

  // Create sample notifications
  const notification1 = await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'ORDER_STATUS_UPDATE',
      title: 'Order Status Update',
      message: 'Your order has been created and is waiting for a driver.',
      data: {
        deliveryId: delivery.id,
        status: 'PENDING'
      }
    }
  });

  const notification2 = await prisma.notification.create({
    data: {
      userId: driverUser.id,
      type: 'NEW_ORDER',
      title: 'New Order Available',
      message: 'A new order is available in your area.',
      data: {
        deliveryId: delivery.id,
        estimatedFare: 1500.00
      }
    }
  });

  console.log('✅ Sample notifications created');

  console.log('🎉 Database seeding completed!');
  console.log('');
  console.log('Default credentials:');
  console.log('Admin: admin@d-ride.com / admin123');
  console.log('User: user@example.com / user123');
  console.log('Driver: driver@example.com / driver123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });