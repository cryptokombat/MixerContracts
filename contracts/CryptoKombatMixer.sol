//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol';
import './interfaces/ICollection.sol';

contract CryptoKombatMixer is ERC1155Holder, Ownable {
    enum HeroEdition {
        EMPTY,
        GENESIS,
        EPIC,
        RARE,
        COMMON
    }

    struct MixRequest {
        address account;
        HeroEdition editionIn;
        uint256[] inIds;
    }

    mapping(HeroEdition => mapping(HeroEdition => uint256)) public mixerConfigs;
    mapping(uint256 => HeroEdition) public heroIdToEdition;
    mapping(HeroEdition => uint256[]) public editionToHeroIds;

    ICollection public collection;

    uint256 private constant DECIMAL_PRECISION = 3;
    uint256 private constant PERCENTS_SUM = 100 * 10**DECIMAL_PRECISION;
    uint256 private randomNonce = 0;

    uint256 private mixRequestId = 0;

    mapping(bytes32 => MixRequest) public mixRequests;

    // EVENTS
    event HeroesMixSuceess(
        address indexed account,
        bytes32 indexed requestId,
        HeroEdition editionIn,
        HeroEdition editionOut,
        uint256 tokenId
    );
    event HeroesMixReverted(address indexed account, bytes32 indexed requestId, HeroEdition editionIn);
    event MixerConfigSet(HeroEdition indexed editionIn, HeroEdition[] indexed editionsOut, uint256[] indexed chances);
    event EditionToIdMappingSet(HeroEdition indexed edition, uint256[] indexed ids);
    event EditionToIdMappingAdded(HeroEdition indexed edition, uint256 indexed id);

    // CONSTRUCTOR
    constructor(address collection_) {
        require(collection_ != address(0), 'CryptoKombatMixer: Collection zero address');
        collection = ICollection(collection_);
    }

    // PUBLIC FUNCTIONS

    function mixHeroes(uint256[] memory _ids) external virtual {
        require(_ids.length == 3, 'CryptoKombatMixer: Incorrect input length');
        require(isSameEditions(_ids), 'CryptoKombatMixer: Input editions are not same');

        collection.safeBatchTransferFrom(msg.sender, address(this), _ids, _getFilledArray(_ids.length, 1), bytes('0x0'));

        mixRequestId++;
        mixRequests[bytes32(mixRequestId)] = MixRequest({ account: msg.sender, editionIn: heroIdToEdition[_ids[0]], inIds: _ids });

        _getOutcome(bytes32(mixRequestId), random());
    }

    // PRIVATE FUNCTIONS

    function _getOutcome(bytes32 requestId, uint256 randomValue) internal {
        MixRequest memory mixRequest = mixRequests[requestId];

        uint256 randomChance = randomValue % PERCENTS_SUM;

        uint256 epicChance = mixerConfigs[mixRequest.editionIn][HeroEdition.EPIC];
        uint256 rareChance = mixerConfigs[mixRequest.editionIn][HeroEdition.RARE];
        uint256 commonChance = mixerConfigs[mixRequest.editionIn][HeroEdition.EPIC];

        HeroEdition editionOut = HeroEdition.EMPTY;

        if (randomChance <= epicChance) {
            editionOut = HeroEdition.EPIC;
        } else if (randomChance <= rareChance) {
            editionOut = HeroEdition.RARE;
        } else {
            editionOut = HeroEdition.COMMON;
        }

        uint256 tokenId = _getValidOutputTokenId(editionOut, randomValue);
        if (tokenId > 0) {
            collection.mint(mixRequest.account, tokenId, 1, bytes('0x0'));
            collection.burnBatch(address(this), mixRequest.inIds, _getFilledArray(mixRequest.inIds.length, 1), bytes('0x0'));

            emit HeroesMixSuceess(mixRequest.account, requestId, mixRequest.editionIn, editionOut, tokenId);
        } else {
            collection.safeBatchTransferFrom(
                address(this),
                mixRequest.account,
                mixRequest.inIds,
                _getFilledArray(mixRequest.inIds.length, 1),
                bytes('0x0')
            );
            emit HeroesMixReverted(mixRequest.account, requestId, mixRequest.editionIn);
        }
    }

    function _getValidOutputTokenId(HeroEdition editionOut, uint256 randomValue) internal view returns (uint256 tokenId) {
        uint256[] memory randomArray = expandRandom(randomValue, 10);
        for (uint256 i = 1; i < randomArray.length; i++) {
            uint256 randomIndex = randomArray[i] % editionToHeroIds[editionOut].length;
            tokenId = editionToHeroIds[editionOut][randomIndex];
            if (collection.totalSupply(tokenId) + 1 < collection.maxSupply(tokenId)) {
                return tokenId;
            }
        }
        return 0;
    }

    // Helper functions

    function isSameEditions(uint256[] memory _ids) internal view returns (bool) {
        HeroEdition _prevEdition = heroIdToEdition[_ids[0]];
        for (uint256 i = 1; i < _ids.length; i++) {
            HeroEdition _currentEdition = heroIdToEdition[_ids[0]];
            if (_prevEdition != _currentEdition) {
                return false;
            }
            _prevEdition = _currentEdition;
        }
        return true;
    }

    function random() private returns (uint256) {
        randomNonce++;
        return uint256(keccak256(abi.encodePacked(block.number, block.timestamp, block.difficulty, _msgSender(), randomNonce)));
    }

    function expandRandom(uint256 randomValue, uint256 n) internal pure returns (uint256[] memory expandedValues) {
        expandedValues = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            expandedValues[i] = uint256(keccak256(abi.encode(randomValue, i)));
        }
        return expandedValues;
    }

    function _getFilledArray(uint256 n, uint256 v) internal pure returns (uint256[] memory array) {
        array = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            array[i] = v;
        }
        return array;
    }

    // Admin functions

    function setMixerConfig(
        HeroEdition _in,
        HeroEdition[] memory _out,
        uint256[] memory _chances
    ) external onlyOwner {
        require(_out.length == _chances.length, 'CryptoKombatMixer: Params length mismatch');

        uint256 sum;
        for (uint256 i = 0; i < _chances.length; i++) {
            sum += _chances[i];
            mixerConfigs[_in][_out[i]] = _chances[i];
        }

        require(sum <= PERCENTS_SUM, 'CryptoKombatMixer: Chances sum exceed 100%');

        emit MixerConfigSet(_in, _out, _chances);
    }

    function setEditionToIdMapping(HeroEdition _edition, uint256[] memory _ids) external onlyOwner {
        require(_edition != HeroEdition.EMPTY, 'CryptoKombatMixer: Cannot set ids for EMPTY edition');

        for (uint256 i = 0; i < _ids.length; i++) {
            heroIdToEdition[_ids[i]] = _edition;
        }
        editionToHeroIds[_edition] = _ids;

        emit EditionToIdMappingSet(_edition, _ids);
    }

    function addEditionToIdMapping(HeroEdition _edition, uint256 _id) external onlyOwner {
        require(_edition != HeroEdition.EMPTY, 'CryptoKombatMixer: Cannot set ids for EMPTY edition');

        heroIdToEdition[_id] = _edition;
        editionToHeroIds[_edition].push(_id);

        emit EditionToIdMappingAdded(_edition, _id);
    }
}
