const customerGroupService = require("../services/customerGroupService");
const catchAsync = require("../utils/catchAsync");

class CustomerGroupController {
  createCustomerGroup = catchAsync(async (req, res) => {
    const customerGroup = await customerGroupService.createCustomerGroup(
      req.body
    );

    res.status(201).json({
      success: true,
      message: "Customer group created successfully",
      data: customerGroup,
    });
  });

  getAllCustomerGroups = catchAsync(async (req, res) => {
    const filters = {
      active:
        req.query.active === "true"
          ? true
          : req.query.active === "false"
          ? false
          : undefined,
    };

    const customerGroups = await customerGroupService.getAllCustomerGroups(
      filters
    );

    res.status(200).json({
      success: true,
      count: customerGroups.length,
      data: customerGroups,
    });
  });

  getCustomerGroupById = catchAsync(async (req, res) => {
    const customerGroup = await customerGroupService.getCustomerGroupById(
      req.params.id
    );

    res.status(200).json({
      success: true,
      data: customerGroup,
    });
  });

  updateCustomerGroup = catchAsync(async (req, res) => {
    const customerGroup = await customerGroupService.updateCustomerGroup(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Customer group updated successfully",
      data: customerGroup,
    });
  });

  toggleCustomerGroupStatus = catchAsync(async (req, res) => {
    const customerGroup = await customerGroupService.toggleCustomerGroupStatus(
      req.params.id
    );

    res.status(200).json({
      success: true,
      message: `Customer group ${
        customerGroup.active ? "activated" : "deactivated"
      } successfully`,
      data: customerGroup,
    });
  });

  deleteCustomerGroup = catchAsync(async (req, res) => {
    await customerGroupService.deleteCustomerGroup(req.params.id);

    res.status(200).json({
      success: true,
      message: "Customer group deleted successfully",
    });
  });
}

module.exports = new CustomerGroupController();

