const CustomerGroup = require("../models/CustomerGroup");
const AppError = require("../utils/AppError");

class CustomerGroupService {
  async createCustomerGroup(data) {
    try {
      const existingGroup = await CustomerGroup.findOne({
        $or: [{ name: data.name }, { code: data.code }],
      });

      if (existingGroup) {
        throw new AppError(
          "Customer group with this name or code already exists",
          400
        );
      }

      const customerGroup = await CustomerGroup.create(data);
      return customerGroup;
    } catch (error) {
      throw error;
    }
  }

  async getAllCustomerGroups(filters = {}) {
    const query = {};

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    const customerGroups = await CustomerGroup.find(query).sort({ name: 1 });
    return customerGroups;
  }

  async getCustomerGroupById(id) {
    const customerGroup = await CustomerGroup.findById(id);

    if (!customerGroup) {
      throw new AppError("Customer group not found", 404);
    }

    return customerGroup;
  }

  async updateCustomerGroup(id, updateData) {
    // Prevent updating code
    delete updateData.code;

    const customerGroup = await CustomerGroup.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!customerGroup) {
      throw new AppError("Customer group not found", 404);
    }

    return customerGroup;
  }

  async toggleCustomerGroupStatus(id) {
    const customerGroup = await CustomerGroup.findById(id);

    if (!customerGroup) {
      throw new AppError("Customer group not found", 404);
    }

    customerGroup.active = !customerGroup.active;
    await customerGroup.save();

    return customerGroup;
  }

  async deleteCustomerGroup(id) {
    // Check if customer group has customers before deleting
    const Customer = require("../models/Customer");
    const customerCount = await Customer.countDocuments({
      customerGroupId: id,
    });

    if (customerCount > 0) {
      throw new AppError(
        "Cannot delete customer group with existing customers",
        400
      );
    }

    const customerGroup = await CustomerGroup.findByIdAndDelete(id);

    if (!customerGroup) {
      throw new AppError("Customer group not found", 404);
    }

    return { message: "Customer group deleted successfully" };
  }
}

module.exports = new CustomerGroupService();

