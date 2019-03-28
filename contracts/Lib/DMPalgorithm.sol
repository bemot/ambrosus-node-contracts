/*
Copyright: Ambrosus Inc.
Email: tech@ambrosus.com

This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is “Incompatible With Secondary Licenses”, as defined by the Mozilla Public License, v. 2.0.
*/

pragma solidity ^0.4.23;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./SafeMathExtensions.sol";

library DMPalgorithm {
    using SafeMath for uint;
    using SafeMath for uint32;
    using SafeMath for uint64;
    using SafeMathExtensions for uint;

    uint constant public DMP_PRECISION = 100;


    function qualifyShelterer(bytes32 DMPbaseHash, uint DMPlength, uint currentRound) internal pure returns (uint32) {
        return uint32(uint256(keccak256(abi.encodePacked(DMPbaseHash, currentRound))).mod(DMPlength));
    }

    function qualifyShelterTypeStake(bytes32 DMPbaseHash, uint[] atlasCount, uint[] ATLAS_NUMERATOR, uint length) internal pure returns (uint) {
        uint denominator = 0;
        uint numeratorSum = 0;
        uint i = 0;

        for (i = 0; i < length; i++) {
            uint elem = atlasCount[i].mul(ATLAS_NUMERATOR[i]);
            denominator = denominator.add(elem);
            numeratorSum = numeratorSum.add(ATLAS_NUMERATOR[i]);
        }

        numeratorSum = numeratorSum.mul(DMP_PRECISION);

        uint currentWCD = 0;
        uint[] memory wcd = new uint[](length);

        for (i = 0; i < length - 1; i++) {
            uint currentNum = atlasCount[i].mul(ATLAS_NUMERATOR[i]);
            if (currentNum == 0) {
                wcd[i] = 0;
            }
            if (currentNum == denominator) {
                wcd[i] = numeratorSum;
                currentWCD = numeratorSum;
            } else {
                currentNum = currentNum.mul(DMP_PRECISION);
                currentNum = currentNum.div(denominator);
                currentWCD = currentWCD.add(currentNum);
                wcd[i] = currentWCD;
            }
        }
        wcd[length-1] = numeratorSum;

        uint chosenStake = length - 1;
        uint randomNumber = uint(DMPbaseHash).mod(numeratorSum);
        for (i = 0; i < length; i++) {
            if (wcd[i] != 0 && randomNumber <= wcd[i]) {
                chosenStake = i;
                break;
            }
        }

        return chosenStake;
    }
}