// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./Quarters.sol";

struct TransferDetails {
    address from;
    address to;
    uint256 value;
    uint256 validAfter;
    uint256 validBefore;
    bytes32 nonce;
    uint8 v;
    bytes32 r;
    bytes32 s;
}

contract MutliTransferSubmitter {
    Quarters quarters;

    constructor(address _quarters) {
        quarters = Quarters(_quarters);
    }

    function multicall(TransferDetails[] memory details) public {
        for (uint256 index = 0; index < details.length; index++) {
            TransferDetails memory transferDetail = details[index];
            quarters.transferWithAuthorization(
                transferDetail.from,
                transferDetail.to,
                transferDetail.value,
                transferDetail.validAfter,
                transferDetail.validBefore,
                transferDetail.nonce,
                transferDetail.v,
                transferDetail.r,
                transferDetail.s
            );
        }
    }
}
