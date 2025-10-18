const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Employee = require('../models/Employee');

const createSampleData = async () => {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create sample employees
    const employees = [
      {
        employeeId: 'EMP001',
        name: 'John Smith',
        position: 'Software Developer',
        dateOfEmployment: new Date('2023-01-15'),
        payRate: 25.00,
        otRate: 37.50,
        vacationPayRate: 25.00,
        breakTimeConfig: {
          isPaid: false,
          duration: 30
        },
        personalInfo: {
          email: 'john.smith@company.com',
          phone: '(555) 123-4567',
          address: '123 Main St, City, State 12345'
        },
        passwordResetInfo: {
          dateOfBirth: new Date('1990-05-15')
        }
      },
      {
        employeeId: 'EMP002',
        name: 'Sarah Johnson',
        position: 'Project Manager',
        dateOfEmployment: new Date('2022-06-01'),
        payRate: 30.00,
        otRate: 45.00,
        vacationPayRate: 30.00,
        breakTimeConfig: {
          isPaid: true,
          duration: 15
        },
        personalInfo: {
          email: 'sarah.johnson@company.com',
          phone: '(555) 234-5678',
          address: '456 Oak Ave, City, State 12345'
        },
        passwordResetInfo: {
          dateOfBirth: new Date('1985-08-22')
        }
      },
      {
        employeeId: 'EMP003',
        name: 'Mike Wilson',
        position: 'Designer',
        dateOfEmployment: new Date('2023-03-10'),
        payRate: 22.00,
        otRate: 33.00,
        vacationPayRate: 22.00,
        breakTimeConfig: {
          isPaid: false,
          duration: 45
        },
        personalInfo: {
          email: 'mike.wilson@company.com',
          phone: '(555) 345-6789',
          address: '789 Pine St, City, State 12345'
        },
        passwordResetInfo: {
          dateOfBirth: new Date('1992-12-03')
        }
      }
    ];

    // Create employees
    for (const empData of employees) {
      const existingEmployee = await Employee.findOne({ employeeId: empData.employeeId });
      if (!existingEmployee) {
        const employee = new Employee(empData);
        await employee.save();
        console.log(`✅ Created employee: ${empData.name} (${empData.employeeId})`);
      } else {
        console.log(`⚠️  Employee already exists: ${empData.name} (${empData.employeeId})`);
      }
    }

    // Create a manager user
    const managerUser = new User({
      username: 'manager',
      email: 'manager@laborgrid.com',
      password: 'manager123',
      role: 'manager'
    });

    const existingManager = await User.findOne({ username: 'manager' });
    if (!existingManager) {
      await managerUser.save();
      console.log('✅ Manager user created successfully!');
      console.log('Username: manager');
      console.log('Password: manager123');
      console.log('Role: manager');
    } else {
      console.log('⚠️  Manager user already exists');
    }

    // Create an employee user
    const employeeUser = new User({
      username: 'employee',
      email: 'employee@laborgrid.com',
      password: 'employee123',
      role: 'employee',
      linkedEmployeeId: (await Employee.findOne({ employeeId: 'EMP001' }))._id
    });

    const existingEmployeeUser = await User.findOne({ username: 'employee' });
    if (!existingEmployeeUser) {
      await employeeUser.save();
      console.log('✅ Employee user created successfully!');
      console.log('Username: employee');
      console.log('Password: employee123');
      console.log('Role: employee');
      console.log('Linked to: John Smith (EMP001)');
    } else {
      console.log('⚠️  Employee user already exists');
    }

    console.log('\n🎉 Sample data created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin: admin / admin123');
    console.log('Manager: manager / manager123');
    console.log('Employee: employee / employee123');

  } catch (error) {
    console.error('Error creating sample data:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createSampleData();
