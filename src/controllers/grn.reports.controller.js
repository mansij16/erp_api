const GRN = require("../models/GRN");
const PO = require("../models/PO");
const Batch = require("../models/Batch");
const { Types } = require("mongoose");
const moment = require("moment-timezone");

/**
 * Get GRN analytics summary
 * @route GET /api/grn/analytics/summary
 * @access private
 */
exports.getGRNSummary = async (req, res) => {
  try {
    const { start_date, end_date, supplier_id, warehouse_id, status } =
      req.query;

    // Build match conditions
    const match = {};

    // Date range filter
    if (start_date || end_date) {
      match.grn_date = {};
      if (start_date) match.grn_date.$gte = new Date(start_date);
      if (end_date) match.grn_date.$lte = new Date(end_date);
    }

    // Supplier filter
    if (supplier_id && Types.ObjectId.isValid(supplier_id)) {
      match.supplier_id = new Types.ObjectId(supplier_id);
    }

    // Warehouse filter
    if (warehouse_id && Types.ObjectId.isValid(warehouse_id)) {
      match.warehouse_id = new Types.ObjectId(warehouse_id);
    }

    // Status filter
    if (status) {
      match.status = { $in: status.split(",") };
    }

    const summary = await GRN.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total_grns: { $sum: 1 },
          total_value: { $sum: "$total" },
          total_items: { $sum: { $size: "$items" } },
          by_status: {
            $push: {
              status: "$status",
              count: 1,
              value: "$total",
            },
          },
          by_supplier: {
            $push: {
              supplier: "$supplier_id",
              supplier_name: "$supplier_name",
              count: 1,
              value: "$total",
            },
          },
          by_warehouse: {
            $push: {
              warehouse: "$warehouse_id",
              count: 1,
              value: "$total",
            },
          },
          by_month: {
            $push: {
              month: { $month: "$grn_date" },
              year: { $year: "$grn_date" },
              count: 1,
              value: "$total",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          total_grns: 1,
          total_value: 1,
          total_items: 1,
          by_status: {
            $reduce: {
              input: "$by_status",
              initialValue: [],
              in: {
                $let: {
                  vars: {
                    existing: {
                      $filter: {
                        input: "$$value",
                        as: "s",
                        cond: { $eq: ["$$s.status", "$$this.status"] },
                      },
                    },
                  },
                  in: {
                    $concatArrays: [
                      {
                        $filter: {
                          input: "$$value",
                          as: "s",
                          cond: { $ne: ["$$s.status", "$$this.status"] },
                        },
                      },
                      [
                        {
                          status: "$$this.status",
                          count: {
                            $cond: {
                              if: { $gt: [{ $size: "$$existing" }, 0] },
                              then: {
                                $add: [
                                  { $arrayElemAt: ["$$existing.count", 0] },
                                  1,
                                ],
                              },
                              else: 1,
                            },
                          },
                          value: {
                            $cond: {
                              if: { $gt: [{ $size: "$$existing" }, 0] },
                              then: {
                                $add: [
                                  { $arrayElemAt: ["$$existing.value", 0] },
                                  "$$this.value",
                                ],
                              },
                              else: "$$this.value",
                            },
                          },
                        },
                      ],
                    ],
                  },
                },
              },
            },
          },
          by_supplier: {
            $slice: [
              {
                $reduce: {
                  input: "$by_supplier",
                  initialValue: [],
                  in: {
                    $let: {
                      vars: {
                        existing: {
                          $filter: {
                            input: "$$value",
                            as: "s",
                            cond: {
                              $and: [
                                { $eq: ["$$s.supplier", "$$this.supplier"] },
                                { $eq: ["$$s.warehouse", "$$this.warehouse"] },
                              ],
                            },
                          },
                        },
                      },
                      in: {
                        $concatArrays: [
                          {
                            $filter: {
                              input: "$$value",
                              as: "s",
                              cond: {
                                $or: [
                                  { $ne: ["$$s.supplier", "$$this.supplier"] },
                                  {
                                    $ne: ["$$s.warehouse", "$$this.warehouse"],
                                  },
                                ],
                              },
                            },
                          },
                          [
                            {
                              supplier: "$$this.supplier",
                              supplier_name: "$$this.supplier_name",
                              warehouse: "$$this.warehouse",
                              count: {
                                $cond: {
                                  if: { $gt: [{ $size: "$$existing" }, 0] },
                                  then: {
                                    $add: [
                                      { $arrayElemAt: ["$$existing.count", 0] },
                                      1,
                                    ],
                                  },
                                  else: 1,
                                },
                              },
                              value: {
                                $cond: {
                                  if: { $gt: [{ $size: "$$existing" }, 0] },
                                  then: {
                                    $add: [
                                      { $arrayElemAt: ["$$existing.value", 0] },
                                      "$$this.value",
                                    ],
                                  },
                                  else: "$$this.value",
                                },
                              },
                            },
                          ],
                        ],
                      },
                    },
                  },
                },
              },
              10, // Limit to top 10 suppliers
            ],
          },
          by_warehouse: {
            $reduce: {
              input: "$by_warehouse",
              initialValue: [],
              in: {
                $let: {
                  vars: {
                    existing: {
                      $filter: {
                        input: "$$value",
                        as: "w",
                        cond: { $eq: ["$$w.warehouse", "$$this.warehouse"] },
                      },
                    },
                  },
                  in: {
                    $concatArrays: [
                      {
                        $filter: {
                          input: "$$value",
                          as: "w",
                          cond: { $ne: ["$$w.warehouse", "$$this.warehouse"] },
                        },
                      },
                      [
                        {
                          warehouse: "$$this.warehouse",
                          count: {
                            $cond: {
                              if: { $gt: [{ $size: "$$existing" }, 0] },
                              then: {
                                $add: [
                                  { $arrayElemAt: ["$$existing.count", 0] },
                                  1,
                                ],
                              },
                              else: 1,
                            },
                          },
                          value: {
                            $cond: {
                              if: { $gt: [{ $size: "$$existing" }, 0] },
                              then: {
                                $add: [
                                  { $arrayElemAt: ["$$existing.value", 0] },
                                  "$$this.value",
                                ],
                              },
                              else: "$$this.value",
                            },
                          },
                        },
                      ],
                    ],
                  },
                },
              },
            },
          },
          by_month: {
            $reduce: {
              input: "$by_month",
              initialValue: [],
              in: {
                $let: {
                  vars: {
                    key: {
                      $concat: [
                        { $toString: "$$this.year" },
                        "-",
                        {
                          $substr: [
                            { $concat: ["0", { $toString: "$$this.month" }] },
                            -2,
                            2,
                          ],
                        },
                      ],
                    },
                    existing: {
                      $filter: {
                        input: "$$value",
                        as: "m",
                        cond: {
                          $and: [
                            { $eq: ["$$m.month", "$$this.month"] },
                            { $eq: ["$$m.year", "$$this.year"] },
                          ],
                        },
                      },
                    },
                  },
                  in: {
                    $concatArrays: [
                      {
                        $filter: {
                          input: "$$value",
                          as: "m",
                          cond: {
                            $or: [
                              { $ne: ["$$m.month", "$$this.month"] },
                              { $ne: ["$$m.year", "$$this.year"] },
                            ],
                          },
                        },
                      },
                      [
                        {
                          month: "$$this.month",
                          year: "$$this.year",
                          month_key: "$$key",
                          month_name: {
                            $dateToString: {
                              format: "%b %Y",
                              date: {
                                $dateFromString: {
                                  dateString: {
                                    $concat: [
                                      { $toString: "$$this.year" },
                                      "-",
                                      {
                                        $substr: [
                                          {
                                            $concat: [
                                              "0",
                                              { $toString: "$$this.month" },
                                            ],
                                          },
                                          -2,
                                          2,
                                        ],
                                      },
                                      "-01T00:00:00.000Z",
                                    ],
                                  },
                                },
                              },
                            },
                          },
                          count: {
                            $cond: {
                              if: { $gt: [{ $size: "$$existing" }, 0] },
                              then: {
                                $add: [
                                  { $arrayElemAt: ["$$existing.count", 0] },
                                  1,
                                ],
                              },
                              else: 1,
                            },
                          },
                          value: {
                            $cond: {
                              if: { $gt: [{ $size: "$$existing" }, 0] },
                              then: {
                                $add: [
                                  { $arrayElemAt: ["$$existing.value", 0] },
                                  "$$this.value",
                                ],
                              },
                              else: "$$this.value",
                            },
                          },
                        },
                      ],
                    ],
                  },
                },
              },
            },
          },
        },
      },
    ]);

    // If no data found
    if (!summary || summary.length === 0) {
      return res.json({
        success: true,
        data: {
          total_grns: 0,
          total_value: 0,
          total_items: 0,
          by_status: [],
          by_supplier: [],
          by_warehouse: [],
          by_month: [],
        },
      });
    }

    res.json({
      success: true,
      data: summary[0],
    });
  } catch (error) {
    console.error("Error getting GRN summary:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get GRN summary",
      message: error.message,
    });
  }
};
